import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { SupplierLog, SupplierLogKind } from './entities/supplier-log.entity';
import { AuditLog } from './entities/audit-log.entity';

/** Keys that must never be persisted, whatever nesting they appear at. */
const SECRET_KEYS = [
  'sign',
  'signature',
  'apikey',
  'api_key',
  'apisecret',
  'api_secret',
  'password',
  'pin',
  'token',
  'secret',
  'authorization',
];

/** Recursively replace credential-looking values with a marker. */
export function redact(value: any, depth = 0): any {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value !== 'object') return value;

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SECRET_KEYS.includes(k.toLowerCase()) ? '[redacted]' : redact(v, depth + 1);
  }
  return out;
}

/** Keep the shape of a destination number without storing it in full. */
export function maskCustomerNo(no?: string): string | undefined {
  if (!no) return undefined;
  if (no.length <= 6) return no;
  return `${no.slice(0, 4)}****${no.slice(-3)}`;
}

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(
    @InjectRepository(SupplierLog)
    private readonly supplierLogs: Repository<SupplierLog>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  /**
   * Record a supplier interaction. Never throws — logging must not be able to
   * fail a transaction that already reached the supplier.
   */
  async logSupplier(entry: {
    driver: string;
    kind: SupplierLogKind;
    refId?: string;
    sku?: string;
    customerNo?: string;
    success: boolean;
    resultStatus?: string;
    message?: string;
    durationMs: number;
    request?: Record<string, any>;
    response?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.supplierLogs.insert({
        ...entry,
        customerNo: maskCustomerNo(entry.customerNo),
        request: redact(entry.request),
        response: redact(entry.response),
      });
    } catch (err: any) {
      this.logger.warn(`Failed to write supplier log: ${err.message}`);
    }
  }

  async logAudit(entry: {
    actorId?: string;
    actorEmail?: string;
    actorRole?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    detail?: Record<string, any>;
    ip?: string;
    success?: boolean;
  }): Promise<void> {
    try {
      await this.auditLogs.insert({
        ...entry,
        detail: redact(entry.detail),
        success: entry.success ?? true,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to write audit log: ${err.message}`);
    }
  }

  // --- reporting -----------------------------------------------------------

  findAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.auditLogs.find({ order: { createdAt: 'DESC' }, take: Math.min(limit, 500) });
  }

  findSupplierLogs(params: { limit?: number; refId?: string }): Promise<SupplierLog[]> {
    return this.supplierLogs.find({
      where: params.refId ? { refId: params.refId } : {},
      order: { createdAt: 'DESC' },
      take: Math.min(params.limit ?? 100, 500),
    });
  }

  /**
   * Per-driver performance over a window. This is the data the audit could
   * not report at all before, because nothing was recorded.
   */
  async supplierPerformance(hours = 24) {
    const since = new Date(Date.now() - hours * 3600_000);
    const rows = await this.supplierLogs.find({
      where: { createdAt: Between(since, new Date()) },
    });

    const byDriver = new Map<string, SupplierLog[]>();
    for (const r of rows) {
      const list = byDriver.get(r.driver);
      if (list) list.push(r);
      else byDriver.set(r.driver, [r]);
    }

    return [...byDriver.entries()].map(([driver, logs]) => {
      const topups = logs.filter((l) => l.kind === SupplierLogKind.TOPUP);
      const durations = logs.map((l) => l.durationMs).sort((a, b) => a - b);
      const success = topups.filter((l) => l.resultStatus === 'success').length;
      const failed = topups.filter((l) => l.resultStatus === 'failed').length;
      const pending = topups.filter((l) => l.resultStatus === 'pending').length;
      const errors = logs.filter((l) => !l.success).length;
      const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

      return {
        driver,
        windowHours: hours,
        calls: logs.length,
        topups: topups.length,
        avgResponseMs: durations.length
          ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
          : 0,
        p95ResponseMs: durations.length
          ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]
          : 0,
        successRate: pct(success, topups.length),
        failRate: pct(failed, topups.length),
        pendingRate: pct(pending, topups.length),
        errorRate: pct(errors, logs.length),
      };
    });
  }
}
