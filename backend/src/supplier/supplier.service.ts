import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DigiflazzAdapter } from './adapters/digiflazz.adapter';
import { MockAdapter } from './adapters/mock.adapter';
import { SupplierAdapter, SupplierTopupResult } from './adapters/supplier-adapter.interface';
import { Product } from '../product/entities/product.entity';

/**
 * Chooses the active supplier adapter from env (SUPPLIER_DRIVER) and falls
 * back to the mock adapter when the chosen real supplier has no credentials.
 * This guarantees the purchase flow never dead-ends in dev.
 */
@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);
  private readonly adapter: SupplierAdapter;

  constructor(
    private readonly config: ConfigService,
    private readonly digiflazz: DigiflazzAdapter,
    private readonly mock: MockAdapter,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {
    const driver = this.config.get<string>('SUPPLIER_DRIVER', 'auto').toLowerCase();
    const real: Record<string, SupplierAdapter> = { digiflazz: this.digiflazz };

    if (driver === 'mock') {
      this.adapter = this.mock;
    } else if (driver !== 'auto' && real[driver]?.isConfigured()) {
      this.adapter = real[driver];
    } else if (driver !== 'auto' && real[driver]) {
      this.logger.warn(`Supplier "${driver}" not configured — falling back to mock`);
      this.adapter = this.mock;
    } else {
      // auto: first configured real supplier, else mock
      this.adapter = Object.values(real).find((a) => a.isConfigured()) ?? this.mock;
    }
    this.logger.log(`Active supplier adapter: ${this.adapter.name}`);
  }

  get driverName(): string {
    return this.adapter.name;
  }

  getBalance(): Promise<number> {
    return this.adapter.getBalance();
  }

  topUp(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    return this.adapter.topUp(params);
  }

  checkStatus(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    return this.adapter.checkStatus(params);
  }

  parseCallback(payload: any, signature?: string): SupplierTopupResult | null {
    return this.adapter.parseCallback?.(payload, signature) ?? null;
  }

  /**
   * Pull the supplier price list and upsert into local products.
   * Selling price = modal * (1 + markup%) + tax handled separately downstream.
   */
  async syncPriceList(): Promise<{ synced: number; driver: string }> {
    const markup = Number(this.config.get<string>('SUPPLIER_MARKUP_PERCENT', '5')) / 100;
    const list = await this.adapter.getPriceList();
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
    this.logger.log(`Synced ${synced} products from ${this.adapter.name}`);
    return { synced, driver: this.adapter.name };
  }

  private extractDenom(name: string, raw?: Record<string, any>): number {
    if (raw?.['denom']) return Number(raw['denom']);
    const m = name.match(/(\d+)\s*[kK]/);
    if (m) return Number(m[1]) * 1000;
    const n = name.match(/(\d{4,})/);
    return n ? Number(n[1]) : 0;
  }
}
