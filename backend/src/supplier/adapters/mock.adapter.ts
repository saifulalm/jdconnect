import { Injectable } from '@nestjs/common';
import {
  SupplierAdapter,
  SupplierPrice,
  SupplierTopupResult,
} from './supplier-adapter.interface';

/**
 * Mock supplier — used when no real supplier credentials are configured.
 * Lets the whole purchase flow (payment -> topup -> status) run end-to-end
 * for local dev / demos without spending real deposit.
 */
@Injectable()
export class MockAdapter implements SupplierAdapter {
  readonly name = 'mock';

  isConfigured(): boolean {
    return true;
  }

  async getBalance(): Promise<number> {
    return 10_000_000;
  }

  async getPriceList(): Promise<SupplierPrice[]> {
    const brands: Array<[string, string]> = [
      ['Telkomsel', 'pulsa'],
      ['Indosat', 'pulsa'],
      ['XL', 'pulsa'],
      ['Tri', 'pulsa'],
      ['Smartfren', 'pulsa'],
    ];
    const denoms = [5000, 10000, 25000, 50000, 100000];
    const out: SupplierPrice[] = [];
    for (const [provider, category] of brands) {
      for (const d of denoms) {
        out.push({
          sku: `${provider.toUpperCase()}_${d / 1000}K`,
          name: `${provider} ${d / 1000}K`,
          category,
          provider,
          price: d + 200, // mock modal margin
          status: true,
        });
      }
    }
    return out;
  }

  async topUp(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    // Deterministic: numbers ending in 0 fail, everything else succeeds.
    const fail = params.customerNo.endsWith('0');
    return {
      refId: params.refId,
      status: fail ? 'failed' : 'success',
      serial: fail ? undefined : `SN${Date.now()}`,
      message: fail ? 'Mock decline (number ends with 0)' : 'Mock top-up success',
      supplierTrxId: `MOCK-${params.refId}`,
    };
  }

  async checkStatus(params: { sku: string; customerNo: string; refId: string }): Promise<SupplierTopupResult> {
    return this.topUp(params);
  }
}
