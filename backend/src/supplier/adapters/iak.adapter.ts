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
 * IAK / Mobilepulsa prepaid H2H adapter.
 * Docs: https://api.iak.id (prepaid)
 *
 * Auth: md5(username + apiKey + <suffix>) where the suffix is
 *   - "pl"      for the price list
 *   - "bl"      for the balance check
 *   - <ref_id>  for a top-up or a status check
 *
 * Response codes: 00 = success, 03 = pending/in process, anything else fails.
 *
 * NOTE: run one sandbox transaction before pointing production at this —
 * providers adjust field names over time and only their live sandbox proves
 * the contract.
 */
@Injectable()
export class IakAdapter implements SupplierAdapter {
  readonly name = 'iak';
  private readonly logger = new Logger(IakAdapter.name);
  private readonly username: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.username = this.config.get<string>('IAK_USERNAME', '');
    this.apiKey = this.config.get<string>('IAK_API_KEY', '');
    const isProd = this.config.get<string>('IAK_PRODUCTION', 'false') === 'true';
    // Sandbox lives on the legacy mobilepulsa host — testprepaid.iak.id no
    // longer resolves (verified: ENOTFOUND), which would surface as an
    // opaque "fetch failed" on every call.
    this.baseUrl = this.config.get<string>(
      'IAK_BASE_URL',
      isProd ? 'https://prepaid.iak.id/api' : 'https://testprepaid.mobilepulsa.net/api',
    );
  }

  isConfigured(): boolean {
    return Boolean(this.username && this.apiKey);
  }

  private sign(suffix: string): string {
    return crypto.createHash('md5').update(this.username + this.apiKey + suffix).digest('hex');
  }

  private async post<T = any>(path: string, body: Record<string, any>): Promise<T> {
    const res = await fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(`IAK ${path} HTTP ${res.status}: ${JSON.stringify(json)}`);
    }
    return json;
  }

  async getBalance(): Promise<number> {
    const json = await this.post('/check-balance', {
      username: this.username,
      sign: this.sign('bl'),
    });
    return Number(json?.data?.balance ?? 0);
  }

  async getPriceList(): Promise<SupplierPrice[]> {
    const json = await this.post('/pricelist', {
      username: this.username,
      sign: this.sign('pl'),
      status: 'all',
    });
    const list: any[] = json?.data?.pricelist ?? json?.data ?? [];
    return list.map((p) => ({
      sku: p.product_code,
      name: p.product_description ?? p.product_name ?? p.product_code,
      category: this.mapCategory(p.product_category ?? p.category),
      provider: p.product_provider ?? p.provider ?? 'Unknown',
      price: Number(p.product_price ?? p.price ?? 0),
      status: (p.product_status ?? p.status) !== false,
      raw: p,
    }));
  }

  async topUp(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    const json = await this.post('/top-up', {
      username: this.username,
      buyer_sku_code: params.sku,
      product_code: params.sku,
      customer_id: params.customerNo,
      ref_id: params.refId,
      sign: this.sign(params.refId),
    });
    return this.mapTrx(json?.data ?? json, params.refId);
  }

  async checkStatus(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    const json = await this.post('/check-status', {
      username: this.username,
      ref_id: params.refId,
      sign: this.sign(params.refId),
    });
    return this.mapTrx(json?.data ?? json, params.refId);
  }

  private mapTrx(data: any, refId: string): SupplierTopupResult {
    return {
      refId,
      status: this.mapStatus(data?.status, data?.response_code ?? data?.rc),
      serial: data?.sn ?? data?.serial_number,
      message: data?.message ?? data?.response_message,
      supplierTrxId: data?.trx_id ? String(data.trx_id) : undefined,
      price: data?.price != null ? Number(data.price) : undefined,
      raw: data,
    };
  }

  /** IAK reports both a numeric status and a response code; trust the code. */
  private mapStatus(status: any, code?: string): SupplierTopupStatus {
    const rc = String(code ?? '').trim();
    if (rc === '00') return 'success';
    if (rc === '03') return 'pending';
    if (rc) return 'failed';

    const s = String(status ?? '').toLowerCase();
    if (s === '1' || s === 'sukses' || s === 'success') return 'success';
    if (s === '0' || s === 'gagal' || s === 'failed') return 'failed';
    return 'pending';
  }

  private mapCategory(c?: string): string {
    const v = (c || '').toLowerCase();
    if (v.includes('pulsa')) return 'pulsa';
    if (v.includes('data') || v.includes('internet')) return 'data';
    if (v.includes('pln') || v.includes('listrik')) return 'pln';
    if (v.includes('game') || v.includes('voucher')) return 'game';
    if (v.includes('emoney') || v.includes('e-money') || v.includes('wallet')) return 'ewallet';
    return 'pulsa';
  }
}
