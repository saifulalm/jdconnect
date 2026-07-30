import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplierService } from './../src/supplier/supplier.service';
import { DigiflazzAdapter } from './../src/supplier/adapters/digiflazz.adapter';
import { IakAdapter } from './../src/supplier/adapters/iak.adapter';
import { VipResellerAdapter } from './../src/supplier/adapters/vip-reseller.adapter';
import { MockAdapter } from './../src/supplier/adapters/mock.adapter';
import { Product } from './../src/product/entities/product.entity';
import { ObservabilityService } from './../src/observability/observability.service';
import { SupplierAdapter, SupplierTopupResult } from './../src/supplier/adapters/supplier-adapter.interface';

/** Adapter stub whose behaviour each test controls. */
class FakeAdapter implements SupplierAdapter {
  topUpCalls = 0;
  constructor(
    readonly name: string,
    private behaviour: 'ok' | 'throw' | 'declines' = 'ok',
  ) {}
  setBehaviour(b: 'ok' | 'throw' | 'declines') {
    this.behaviour = b;
  }
  isConfigured() {
    return true;
  }
  async getBalance() {
    if (this.behaviour === 'throw') throw new Error(`${this.name} down`);
    return 1_000;
  }
  async getPriceList() {
    return [];
  }
  async topUp(params: { refId: string }): Promise<SupplierTopupResult> {
    this.topUpCalls++;
    if (this.behaviour === 'throw') throw new Error(`${this.name} timeout`);
    if (this.behaviour === 'declines') {
      return { refId: params.refId, status: 'failed', message: `${this.name} declined` };
    }
    return { refId: params.refId, status: 'success', serial: `SN-${this.name}` };
  }
  async checkStatus(params: { refId: string }): Promise<SupplierTopupResult> {
    return { refId: params.refId, status: 'success', serial: `SN-${this.name}` };
  }
}

describe('Supplier failover (e2e)', () => {
  let service: SupplierService;
  let primary: FakeAdapter;
  let secondary: FakeAdapter;
  let tertiary: FakeAdapter;

  beforeEach(async () => {
    primary = new FakeAdapter('digiflazz');
    secondary = new FakeAdapter('iak');
    tertiary = new FakeAdapter('vip-reseller');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: DigiflazzAdapter, useValue: primary },
        { provide: IakAdapter, useValue: secondary },
        { provide: VipResellerAdapter, useValue: tertiary },
        { provide: MockAdapter, useValue: new FakeAdapter('mock') },
        { provide: getRepositoryToken(Product), useValue: { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn() } },
        { provide: ObservabilityService, useValue: { logSupplier: jest.fn(), logAudit: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, def?: string) =>
              ({
                SUPPLIER_DRIVER: 'auto',
                SUPPLIER_PRIORITY: 'digiflazz,iak,vip-reseller',
                SUPPLIER_MARKUP_PERCENT: '5',
              })[key] ?? def ?? '',
          },
        },
      ],
    }).compile();

    service = module.get(SupplierService);
  });

  it('registers every configured supplier in priority order', () => {
    const list = service.listSuppliers();
    expect(list.map((s) => s.name)).toEqual(['digiflazz', 'iak', 'vip-reseller']);
    expect(list.every((s) => s.configured && s.healthy)).toBe(true);
    expect(service.driverName).toBe('digiflazz');
  });

  it('moves to the next supplier when the primary errors', async () => {
    primary.setBehaviour('throw');

    const result = await service.topUp({ sku: 'X', customerNo: '0812', refId: 'REF-1' });

    expect(result.status).toBe('success');
    expect(result.driver).toBe('iak'); // served by the fallback
    expect(primary.topUpCalls).toBe(1);
    expect(secondary.topUpCalls).toBe(1);
    expect(tertiary.topUpCalls).toBe(0); // not needed
  });

  it('does not retry elsewhere when a supplier deliberately declines', async () => {
    // A decline is a decision, not an outage — retrying risks double credit.
    primary.setBehaviour('declines');

    const result = await service.topUp({ sku: 'X', customerNo: '0812', refId: 'REF-2' });

    expect(result.status).toBe('failed');
    expect(result.driver).toBe('digiflazz');
    expect(secondary.topUpCalls).toBe(0);
  });

  it('trips the breaker after repeated failures and stops calling that supplier', async () => {
    primary.setBehaviour('throw');

    for (let i = 0; i < 3; i++) {
      await service.topUp({ sku: 'X', customerNo: '0812', refId: `REF-B${i}` });
    }
    expect(primary.topUpCalls).toBe(3);

    const state = service.listSuppliers().find((s) => s.name === 'digiflazz');
    expect(state?.healthy).toBe(false);
    expect(state?.consecutiveFailures).toBeGreaterThanOrEqual(3);

    // Further orders skip the tripped supplier entirely.
    await service.topUp({ sku: 'X', customerNo: '0812', refId: 'REF-B9' });
    expect(primary.topUpCalls).toBe(3);
    expect(service.driverName).toBe('iak');
  });

  it('fails loudly only when every supplier is down', async () => {
    primary.setBehaviour('throw');
    secondary.setBehaviour('throw');
    tertiary.setBehaviour('throw');

    await expect(
      service.topUp({ sku: 'X', customerNo: '0812', refId: 'REF-3' }),
    ).rejects.toThrow(/Semua supplier gagal/);
  });

  it('reports balances per supplier without one failure hiding the rest', async () => {
    secondary.setBehaviour('throw');

    const balances = await service.getBalances();
    expect(balances).toHaveLength(3);
    expect(balances.find((b) => b.driver === 'digiflazz')?.balance).toBe(1000);
    expect(balances.find((b) => b.driver === 'iak')?.balance).toBeNull();
    expect(balances.find((b) => b.driver === 'iak')?.error).toMatch(/down/);
  });
});
