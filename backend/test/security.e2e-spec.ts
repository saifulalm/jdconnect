import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Product, ProductCategory } from './../src/product/entities/product.entity';
import { DigiflazzAdapter } from './../src/supplier/adapters/digiflazz.adapter';
import { validateEnv } from './../src/config/env.validation';

/**
 * Regression tests for the audit findings. Each case reproduces an attack
 * that previously succeeded against the running app.
 */
describe('Security regressions (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let product: Product;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const repo = dataSource.getRepository(Product);
    product = await repo.save(
      repo.create({
        sku: 'SEC_TEST_10K',
        name: 'Security Test 10K',
        category: ProductCategory.PULSA,
        provider: 'Telkomsel',
        denomination: 10000,
        price: 11500,
        isActive: true,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  async function createOrder(phone = '081234567891') {
    const res = await request(app.getHttpServer())
      .post('/orders/guest')
      .send({ productId: product.id, phoneNumber: phone })
      .expect(201);
    return res.body.invoiceNumber as string;
  }

  // C-01
  it('rejects a Midtrans webhook with a forged signature', async () => {
    const invoice = await createOrder();

    await request(app.getHttpServer())
      .post('/payment/midtrans/callback')
      .send({
        order_id: invoice,
        status_code: '200',
        gross_amount: '1.00',
        signature_key: 'FORGED',
        transaction_status: 'settlement',
      })
      .expect(201)
      .expect((res) => expect(res.body.status).toBe('invalid_signature'));

    const track = await request(app.getHttpServer())
      .get(`/orders/track/${invoice}?phone=7891`)
      .expect(200);

    // The order must still be unpaid — no supplier top-up may have happened.
    expect(track.body.paymentStatus).toBe('pending');
    expect(track.body.status).toBe('pending');
    expect(track.body.serialNumber).toBeFalsy();
  });

  // C-03
  it('rejects supplier callbacks that are unsigned or mis-signed', () => {
    const payload = { data: { ref_id: 'INV-X', status: 'Sukses', sn: 'FAKE' } };
    const raw = Buffer.from(JSON.stringify(payload), 'utf8');
    const cfg = (env: Record<string, string>) =>
      new DigiflazzAdapter({ get: (k: string, d?: string) => env[k] ?? d ?? '' } as any);

    // No webhook secret configured -> must never be trusted.
    const noSecret = cfg({ DIGIFLAZZ_USERNAME: 'u', DIGIFLAZZ_PROD_KEY: 'k' });
    expect(noSecret.parseCallback(payload, 'sha1=anything', raw)).toBeNull();

    const withSecret = cfg({
      DIGIFLAZZ_USERNAME: 'u',
      DIGIFLAZZ_PROD_KEY: 'k',
      DIGIFLAZZ_WEBHOOK_SECRET: 's3cr3t',
    });
    expect(withSecret.parseCallback(payload, undefined, raw)).toBeNull();
    expect(withSecret.parseCallback(payload, 'sha1=wrong', raw)).toBeNull();

    const valid =
      'sha1=' + crypto.createHmac('sha1', 's3cr3t').update(raw).digest('hex');
    expect(withSecret.parseCallback(payload, valid, raw)?.status).toBe('success');
  });

  // C-05
  it('refuses to boot without a usable JWT_SECRET', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).toThrow(/JWT_SECRET/);
    expect(() =>
      validateEnv({ NODE_ENV: 'development', JWT_SECRET: 'default-secret' }),
    ).toThrow(/JWT_SECRET/);
    expect(() =>
      validateEnv({ NODE_ENV: 'development', JWT_SECRET: 'a-perfectly-fine-dev-secret' }),
    ).not.toThrow();
  });

  // C-02 + production hardening
  it('refuses to run in production with the mock gateway or schema sync', () => {
    const base = {
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(40),
      DB_HOST: 'localhost',
      TYPEORM_SYNC: 'false',
    };
    expect(() => validateEnv(base)).toThrow(/payment driver/i);
    expect(() =>
      validateEnv({ ...base, TYPEORM_SYNC: 'true', QRIS_STATIC_CODE: 'x' }),
    ).toThrow(/TYPEORM_SYNC/);
    expect(() =>
      validateEnv({ ...base, DIGIFLAZZ_USERNAME: 'u', QRIS_STATIC_CODE: 'x' }),
    ).toThrow(/DIGIFLAZZ_WEBHOOK_SECRET/);
    expect(() => validateEnv({ ...base, QRIS_STATIC_CODE: 'x' })).not.toThrow();
  });

  // H-02
  it('enforces invoice uniqueness at the database level', async () => {
    const invoice = await createOrder();
    const repo = dataSource.getRepository('transactions');
    const existing: any = await repo.findOne({ where: { invoiceNumber: invoice } });

    await expect(
      repo.insert({ ...existing, id: undefined, invoiceNumber: invoice }),
    ).rejects.toBeDefined();
  });
});
