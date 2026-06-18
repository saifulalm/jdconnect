import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  SupplierAdapter,
  SupplierPrice,
  SupplierTopupResult,
  SupplierTopupStatus,
} from './supplier-adapter.interface';

/**
 * Digiflazz H2H adapter.
 * Docs: https://developer.digiflazz.com
 * Auth: every request signed with md5(username + apiKey + <suffix>).
 *  - cek-saldo  -> suffix "depo"
 *  - price-list -> suffix "pricelist"
 *  - transaction-> suffix = ref_id
 */
@Injectable()
export class DigiflazzAdapter implements SupplierAdapter {
  readonly name = 'digiflazz';
  private readonly logger = new Logger(DigiflazzAdapter.name);
  private readonly baseUrl = 'https://api.digiflazz.com/v1';
  private readonly username: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    this.username = this.config.get<string>('DIGIFLAZZ_USERNAME', '');
    // Use production key in prod, dev/sandbox key otherwise (if provided).
    const prodKey = this.config.get<string>('DIGIFLAZZ_PROD_KEY', '');
    const devKey = this.config.get<string>('DIGIFLAZZ_DEV_KEY', '');
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    this.apiKey = (isProd ? prodKey : devKey) || prodKey || devKey;
    this.webhookSecret = this.config.get<string>('DIGIFLAZZ_WEBHOOK_SECRET', '');
  }

  isConfigured(): boolean {
    return Boolean(this.username && this.apiKey);
  }

  private sign(suffix: string): string {
    return crypto.createHash('md5').update(this.username + this.apiKey + suffix).digest('hex');
  }

  private async post<T = any>(path: string, body: Record<string, any>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(`Digiflazz ${path} HTTP ${res.status}: ${JSON.stringify(json)}`);
    }
    return json;
  }

  async getBalance(): Promise<number> {
    const json = await this.post('/cek-saldo', {
      cmd: 'deposit',
      username: this.username,
      sign: this.sign('depo'),
    });
    return Number(json?.data?.deposit ?? 0);
  }

  async getPriceList(): Promise<SupplierPrice[]> {
    const json = await this.post('/price-list', {
      cmd: 'prepaid',
      username: this.username,
      sign: this.sign('pricelist'),
    });
    const list: any[] = json?.data ?? [];
    return list.map((p) => ({
      sku: p.buyer_sku_code,
      name: p.product_name,
      category: this.mapCategory(p.category),
      provider: p.brand,
      price: Number(p.price),
      status: p.buyer_product_status === true && p.seller_product_status === true,
      raw: p,
    }));
  }

  async topUp(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    const json = await this.post('/transaction', {
      username: this.username,
      buyer_sku_code: params.sku,
      customer_no: params.customerNo,
      ref_id: params.refId,
      sign: this.sign(params.refId),
    });
    return this.mapTrx(json?.data, params.refId);
  }

  async checkStatus(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    // Digiflazz: re-posting the same ref_id returns current status (idempotent).
    return this.topUp(params);
  }

  parseCallback(payload: any, signature?: string): SupplierTopupResult | null {
    // Digiflazz signs webhook with HMAC-SHA1(rawBody, webhookSecret) in X-Hub-Signature.
    if (this.webhookSecret && signature) {
      const expected =
        'sha1=' +
        crypto.createHmac('sha1', this.webhookSecret).update(JSON.stringify(payload)).digest('hex');
      if (expected !== signature) {
        this.logger.warn('Digiflazz webhook signature mismatch');
        return null;
      }
    }
    const data = payload?.data ?? payload;
    if (!data?.ref_id) return null;
    return this.mapTrx(data, data.ref_id);
  }

  private mapTrx(data: any, refId: string): SupplierTopupResult {
    const status = this.mapStatus(data?.status);
    return {
      refId,
      status,
      serial: data?.sn,
      message: data?.message,
      supplierTrxId: data?.trx_id,
      price: data?.price != null ? Number(data.price) : undefined,
      raw: data,
    };
  }

  private mapStatus(s?: string): SupplierTopupStatus {
    switch ((s || '').toLowerCase()) {
      case 'sukses':
      case 'success':
        return 'success';
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
    if (v.includes('data')) return 'data';
    if (v.includes('pln')) return 'pln';
    if (v.includes('game')) return 'game';
    if (v.includes('e-money') || v.includes('ewallet') || v.includes('e-wallet')) return 'ewallet';
    return 'pulsa';
  }
}
