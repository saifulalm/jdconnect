import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  SupplierAdapter,
  SupplierPrice,
  SupplierTopupResult,
  SupplierTopupStatus,
} from './supplier-adapter.interface';
import { fetchWithTimeout } from '../../common/http.util';

/**
 * VIP Reseller prepaid H2H adapter.
 * Docs: https://vip-reseller.co.id/page/api
 *
 * Auth: form-encoded body carrying `key` (API key) and
 * `sign` = md5(apiId + apiKey), constant per account.
 *
 * Game top-ups address the customer as data_no + data_zone; this adapter
 * accepts the combined "userId/zoneId" form produced upstream.
 *
 * NOTE: validate against the provider sandbox before production — the
 * response envelope differs slightly between their prepaid and game APIs.
 */
@Injectable()
export class VipResellerAdapter implements SupplierAdapter {
  readonly name = 'vip-reseller';
  private readonly logger = new Logger(VipResellerAdapter.name);
  private readonly baseUrl = 'https://vip-reseller.co.id/api';
  private readonly apiId: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiId = this.config.get<string>('VIP_API_ID', '');
    this.apiKey = this.config.get<string>('VIP_API_KEY', '');
  }

  isConfigured(): boolean {
    return Boolean(this.apiId && this.apiKey);
  }

  private get sign(): string {
    return crypto.createHash('md5').update(this.apiId + this.apiKey).digest('hex');
  }

  private async post<T = any>(path: string, fields: Record<string, string>): Promise<T> {
    const body = new URLSearchParams({
      key: this.apiKey,
      sign: this.sign,
      ...fields,
    });
    const res = await fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(`VIP ${path} HTTP ${res.status}: ${JSON.stringify(json)}`);
    }
    if (json?.result === false && json?.message) {
      throw new Error(`VIP ${path}: ${json.message}`);
    }
    return json;
  }

  async getBalance(): Promise<number> {
    const json = await this.post('/profile', { type: 'profile' });
    return Number(json?.data?.balance ?? 0);
  }

  async getPriceList(): Promise<SupplierPrice[]> {
    const json = await this.post('/prepaid', { type: 'services' });
    const list: any[] = json?.data ?? [];
    return list.map((p) => ({
      sku: p.code,
      name: p.name,
      category: this.mapCategory(p.category ?? p.type),
      provider: p.brand ?? p.category ?? 'Unknown',
      price: Number(p.price?.basic ?? p.price ?? 0),
      status: (p.status ?? 'available') === 'available',
      raw: p,
    }));
  }

  /** Split "userId/zoneId" — game orders need the zone as a separate field. */
  private splitCustomer(customerNo: string): { dataNo: string; dataZone?: string } {
    const [dataNo, dataZone] = customerNo.split('/');
    return { dataNo, dataZone };
  }

  async topUp(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    const { dataNo, dataZone } = this.splitCustomer(params.customerNo);
    const json = await this.post('/prepaid', {
      type: 'order',
      service: params.sku,
      data_no: dataNo,
      ...(dataZone ? { data_zone: dataZone } : {}),
    });
    return this.mapTrx(json?.data, params.refId);
  }

  async checkStatus(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    // VIP tracks by its own trx_id, which we persist as supplierTrxId.
    const json = await this.post('/prepaid', {
      type: 'status',
      trxid: params.refId,
    });
    const data = Array.isArray(json?.data) ? json.data[0] : json?.data;
    return this.mapTrx(data, params.refId);
  }

  private mapTrx(data: any, refId: string): SupplierTopupResult {
    return {
      refId,
      status: this.mapStatus(data?.status),
      serial: data?.sn ?? data?.note,
      message: data?.note ?? data?.message,
      supplierTrxId: data?.trxid ? String(data.trxid) : undefined,
      price: data?.price != null ? Number(data.price) : undefined,
      raw: data,
    };
  }

  private mapStatus(s?: string): SupplierTopupStatus {
    switch ((s || '').toLowerCase()) {
      case 'success':
      case 'sukses':
        return 'success';
      case 'error':
      case 'gagal':
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private mapCategory(c?: string): string {
    const v = (c || '').toLowerCase();
    if (v.includes('pulsa')) return 'pulsa';
    if (v.includes('data') || v.includes('kuota')) return 'data';
    if (v.includes('pln') || v.includes('listrik')) return 'pln';
    if (v.includes('game') || v.includes('voucher')) return 'game';
    if (v.includes('wallet') || v.includes('e-money')) return 'ewallet';
    return 'pulsa';
  }
}
