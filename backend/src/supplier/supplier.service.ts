import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigiflazzAdapter } from './adapters/digiflazz.adapter';
import { IakAdapter } from './adapters/iak.adapter';
import { VipResellerAdapter } from './adapters/vip-reseller.adapter';
import { MockAdapter } from './adapters/mock.adapter';
import { SupplierAdapter, SupplierTopupResult } from './adapters/supplier-adapter.interface';
import { Product } from '../product/entities/product.entity';
import { ObservabilityService } from '../observability/observability.service';
import { SupplierLogKind } from '../observability/entities/supplier-log.entity';

/** Consecutive failures before a supplier is taken out of rotation. */
const BREAKER_THRESHOLD = 3;
/** How long a tripped supplier stays out before a probe is allowed. */
const BREAKER_COOLDOWN_MS = 60_000;

interface BreakerState {
  failures: number;
  openedAt?: number;
}

/**
 * Registry of upstream suppliers, tried in priority order.
 *
 * Only one supplier used to be selectable, so an outage there stopped every
 * top-up. Now each configured supplier is ranked, a failing one is skipped
 * after repeated errors (circuit breaker), and the next one takes over.
 *
 * Order comes from SUPPLIER_PRIORITY (comma separated names). Anything
 * configured but unlisted is appended; the mock adapter is only ever used
 * when no real supplier has credentials.
 */
@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);
  private readonly registry: SupplierAdapter[];
  private readonly breakers = new Map<string, BreakerState>();

  constructor(
    private readonly config: ConfigService,
    private readonly digiflazz: DigiflazzAdapter,
    private readonly iak: IakAdapter,
    private readonly vip: VipResellerAdapter,
    private readonly mock: MockAdapter,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly observability: ObservabilityService,
  ) {
    this.registry = this.buildRegistry();
    this.logger.log(
      `Supplier registry: ${this.registry.map((a) => a.name).join(' > ')} ` +
        `(primary: ${this.registry[0]?.name})`,
    );
  }

  private buildRegistry(): SupplierAdapter[] {
    const all: SupplierAdapter[] = [this.digiflazz, this.iak, this.vip];
    const driver = this.config.get<string>('SUPPLIER_DRIVER', 'auto').toLowerCase();

    // Explicit single-driver override keeps the old behaviour available.
    if (driver === 'mock') return [this.mock];
    if (driver !== 'auto') {
      const chosen = all.find((a) => a.name === driver);
      if (chosen?.isConfigured()) return [chosen];
      this.logger.warn(`Supplier "${driver}" is not configured — falling back to mock`);
      return [this.mock];
    }

    const configured = all.filter((a) => a.isConfigured());
    if (configured.length === 0) return [this.mock];

    const priority = this.config
      .get<string>('SUPPLIER_PRIORITY', '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const ranked = [
      ...priority
        .map((name) => configured.find((a) => a.name === name))
        .filter((a): a is SupplierAdapter => Boolean(a)),
      ...configured.filter((a) => !priority.includes(a.name)),
    ];
    return ranked;
  }

  /** Primary supplier name — what new transactions are attributed to. */
  get driverName(): string {
    return this.healthyAdapters()[0]?.name ?? this.registry[0].name;
  }

  /** Every registered supplier with its live breaker state. */
  listSuppliers() {
    return this.registry.map((a, index) => {
      const b = this.breakers.get(a.name);
      const open = this.isOpen(a.name);
      return {
        name: a.name,
        priority: index + 1,
        configured: a.isConfigured(),
        healthy: !open,
        consecutiveFailures: b?.failures ?? 0,
        cooldownUntil: open && b?.openedAt ? new Date(b.openedAt + BREAKER_COOLDOWN_MS) : null,
      };
    });
  }

  private isOpen(name: string): boolean {
    const b = this.breakers.get(name);
    if (!b?.openedAt) return false;
    if (Date.now() - b.openedAt >= BREAKER_COOLDOWN_MS) {
      // Cooldown elapsed — allow one probe through (half-open).
      this.breakers.set(name, { failures: BREAKER_THRESHOLD - 1 });
      return false;
    }
    return true;
  }

  private recordSuccess(name: string): void {
    if (this.breakers.has(name)) this.breakers.delete(name);
  }

  private recordFailure(name: string): void {
    const b = this.breakers.get(name) ?? { failures: 0 };
    b.failures += 1;
    if (b.failures >= BREAKER_THRESHOLD) {
      b.openedAt = Date.now();
      this.logger.error(
        `Supplier "${name}" tripped the circuit breaker after ${b.failures} failures — ` +
          `skipping it for ${BREAKER_COOLDOWN_MS / 1000}s`,
      );
    }
    this.breakers.set(name, b);
  }

  private healthyAdapters(): SupplierAdapter[] {
    const healthy = this.registry.filter((a) => !this.isOpen(a.name));
    // Never strand traffic: if every supplier is tripped, try them anyway.
    return healthy.length ? healthy : this.registry;
  }

  /**
   * Run an operation against the supplier chain: time it, log it, and on a
   * transport-level failure move to the next supplier.
   */
  private async run<T>(
    kind: SupplierLogKind,
    context: { refId?: string; sku?: string; customerNo?: string; request?: Record<string, any> },
    op: (adapter: SupplierAdapter) => Promise<T>,
    describe?: (result: T) => { resultStatus?: string; message?: string; response?: Record<string, any> },
    options: { failover?: boolean } = { failover: true },
  ): Promise<{ result: T; adapter: SupplierAdapter }> {
    const candidates = options.failover ? this.healthyAdapters() : [this.healthyAdapters()[0]];
    let lastError: any;

    for (const adapter of candidates) {
      const startedAt = Date.now();
      try {
        const result = await op(adapter);
        const info = describe?.(result) ?? {};
        this.recordSuccess(adapter.name);
        void this.observability.logSupplier({
          driver: adapter.name,
          kind,
          ...context,
          success: true,
          resultStatus: info.resultStatus,
          message: info.message,
          durationMs: Date.now() - startedAt,
          response: info.response,
        });
        return { result, adapter };
      } catch (err: any) {
        lastError = err;
        this.recordFailure(adapter.name);
        void this.observability.logSupplier({
          driver: adapter.name,
          kind,
          ...context,
          success: false,
          resultStatus: 'error',
          message: err?.message,
          durationMs: Date.now() - startedAt,
        });
        this.logger.warn(
          `Supplier "${adapter.name}" failed (${err?.message}) — ` +
            (candidates.indexOf(adapter) < candidates.length - 1
              ? 'trying next supplier'
              : 'no supplier left'),
        );
      }
    }

    throw new ServiceUnavailableException(
      `Semua supplier gagal memproses permintaan: ${lastError?.message ?? 'unknown error'}`,
    );
  }

  async getBalance(): Promise<number> {
    const { result } = await this.run(
      SupplierLogKind.BALANCE,
      {},
      (a) => a.getBalance(),
      (balance) => ({ response: { balance } }),
    );
    return result;
  }

  /** Balance across every configured supplier — one row per provider. */
  async getBalances(): Promise<Array<{ driver: string; balance: number | null; error?: string }>> {
    return Promise.all(
      this.registry.map(async (a) => {
        try {
          return { driver: a.name, balance: await a.getBalance() };
        } catch (err: any) {
          return { driver: a.name, balance: null, error: err?.message };
        }
      }),
    );
  }

  /**
   * Execute a top-up. Failover applies only to transport errors — a supplier
   * that answers "failed" has made a decision, and retrying it elsewhere
   * risks double-crediting the customer.
   */
  async topUp(params: {
    sku: string;
    customerNo: string;
    refId: string;
  }): Promise<SupplierTopupResult & { driver: string }> {
    const { result, adapter } = await this.run(
      SupplierLogKind.TOPUP,
      { refId: params.refId, sku: params.sku, customerNo: params.customerNo, request: params },
      (a) => a.topUp(params),
      (r) => ({ resultStatus: r.status, message: r.message, response: r.raw ?? { serial: r.serial } }),
    );
    return { ...result, driver: adapter.name };
  }

  /** Status checks must hit the supplier that owns the reference. */
  async checkStatus(params: {
    sku: string;
    customerNo: string;
    refId: string;
    driver?: string;
  }): Promise<SupplierTopupResult> {
    const owner = params.driver
      ? this.registry.find((a) => a.name === params.driver)
      : undefined;

    if (owner) {
      const startedAt = Date.now();
      try {
        const result = await owner.checkStatus(params);
        void this.observability.logSupplier({
          driver: owner.name,
          kind: SupplierLogKind.STATUS,
          refId: params.refId,
          sku: params.sku,
          customerNo: params.customerNo,
          success: true,
          resultStatus: result.status,
          message: result.message,
          durationMs: Date.now() - startedAt,
          response: result.raw ?? {},
        });
        return result;
      } catch (err: any) {
        void this.observability.logSupplier({
          driver: owner.name,
          kind: SupplierLogKind.STATUS,
          refId: params.refId,
          success: false,
          resultStatus: 'error',
          message: err?.message,
          durationMs: Date.now() - startedAt,
        });
        throw err;
      }
    }

    const { result } = await this.run(
      SupplierLogKind.STATUS,
      { refId: params.refId, sku: params.sku, customerNo: params.customerNo, request: params },
      (a) => a.checkStatus(params),
      (r) => ({ resultStatus: r.status, message: r.message, response: r.raw ?? {} }),
      { failover: false },
    );
    return result;
  }

  /**
   * Verify an inbound callback. Each supplier signs differently, so the
   * payload is offered to every adapter until one accepts it.
   */
  parseCallback(payload: any, signature?: string, rawBody?: Buffer): SupplierTopupResult | null {
    let result: SupplierTopupResult | null = null;
    let acceptedBy: string | undefined;

    for (const adapter of this.registry) {
      const parsed = adapter.parseCallback?.(payload, signature, rawBody) ?? null;
      if (parsed) {
        result = parsed;
        acceptedBy = adapter.name;
        break;
      }
    }

    // Record accepted and rejected callbacks alike: a rejected one is exactly
    // what an investigation needs to see.
    void this.observability.logSupplier({
      driver: acceptedBy ?? this.registry[0].name,
      kind: SupplierLogKind.CALLBACK,
      refId: result?.refId,
      success: Boolean(result),
      resultStatus: result?.status ?? 'rejected',
      message: result
        ? result.message
        : 'Callback rejected by every supplier (signature invalid or unverifiable)',
      durationMs: 0,
      request: payload,
    });
    return result;
  }

  /**
   * Pull the price list and upsert into local products.
   * Selling price = modal * (1 + markup%); tax is applied downstream.
   */
  async syncPriceList(driverName?: string): Promise<{ synced: number; driver: string }> {
    const markup = Number(this.config.get<string>('SUPPLIER_MARKUP_PERCENT', '5')) / 100;
    const target = driverName
      ? this.registry.find((a) => a.name === driverName)
      : undefined;

    const { result: list, adapter } = target
      ? { result: await target.getPriceList(), adapter: target }
      : await this.run(
          SupplierLogKind.PRICE_LIST,
          {},
          (a) => a.getPriceList(),
          (rows) => ({ response: { items: rows.length } }),
        );

    let synced = 0;
    for (const p of list) {
      const denomination = this.extractDenom(p.name, p.raw);
      const sellPrice = Math.ceil(p.price * (1 + markup));
      const existing = await this.productRepo.findOne({ where: { sku: p.sku } });
      const data: Partial<Product> = {
        sku: p.sku,
        name: p.name,
        category: p.category as any,
        provider: p.provider,
        denomination,
        price: sellPrice,
        isActive: p.status,
        description: `${p.provider} ${p.name}`,
      };
      if (existing) {
        await this.productRepo.update(existing.id, data);
      } else {
        await this.productRepo.save(this.productRepo.create(data));
      }
      synced++;
    }
    this.logger.log(`Synced ${synced} products from ${adapter.name}`);
    return { synced, driver: adapter.name };
  }

  private extractDenom(name: string, raw?: Record<string, any>): number {
    if (raw?.['denom']) return Number(raw['denom']);
    const m = name.match(/(\d+)\s*[kK]/);
    if (m) return Number(m[1]) * 1000;
    const n = name.match(/(\d{4,})/);
    return n ? Number(n[1]) : 0;
  }
}
