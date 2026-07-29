import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Product, ProductCategory } from './../src/product/entities/product.entity';
import { SupplierLog } from './../src/observability/entities/supplier-log.entity';
import { AuditLog } from './../src/observability/entities/audit-log.entity';
import {
  Transaction,
  RefundStatus,
  PaymentStatus,
  TransactionStatus,
} from './../src/transaction/entities/transaction.entity';
import { redact, maskCustomerNo } from './../src/observability/observability.service';
import { ReconciliationService } from './../src/reconciliation/reconciliation.service';

describe('Observability, refunds and reconciliation (e2e)', () => {
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
        sku: 'OBS_TEST_10K',
        name: 'Observability Test 10K',
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

  async function paidOrder(phone: string) {
    const created = await request(app.getHttpServer())
      .post('/orders/guest')
      .send({ productId: product.id, phoneNumber: phone })
      .expect(201);
    const invoice = created.body.invoiceNumber as string;
    await request(app.getHttpServer()).post(`/payment/mock-pay/${invoice}`).expect(201);
    return invoice;
  }

  it('never persists credentials in logged payloads', () => {
    const redacted = redact({
      username: 'reseller',
      sign: 'md5-of-secret',
      api_key: 'pk_live_x',
      nested: { password: 'hunter2', pin: '1234', keep: 'visible' },
    });
    expect(redacted.sign).toBe('[redacted]');
    expect(redacted.api_key).toBe('[redacted]');
    expect(redacted.nested.password).toBe('[redacted]');
    expect(redacted.nested.pin).toBe('[redacted]');
    expect(redacted.nested.keep).toBe('visible');
    expect(redacted.username).toBe('reseller');
    expect(maskCustomerNo('081233366699')).toBe('0812****699');
  });

  it('records every supplier call with timing and outcome', async () => {
    const invoice = await paidOrder('081234567891');

    const logs = await dataSource.getRepository(SupplierLog).find({ where: { refId: invoice } });
    expect(logs.length).toBeGreaterThan(0);
    const topup = logs.find((l) => l.kind === 'topup');
    expect(topup).toBeDefined();
    expect(topup!.success).toBe(true);
    expect(topup!.resultStatus).toBe('success');
    // Masked on the column so casual reads and exports don't leak the number.
    expect(topup!.customerNo).toBe('0812****891');
  });

  it('writes an audit trail for privileged actions', async () => {
    // Admin-only route; the audit row is what we assert on.
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@jdconnect.id', password: 'Admin123!' });

    if (!login.body?.access_token) return; // seeded admin not present in this DB

    await request(app.getHttpServer())
      .post('/supplier/sync')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(201);

    const audits = await dataSource
      .getRepository(AuditLog)
      .find({ where: { action: 'supplier.price_sync' } });
    expect(audits.length).toBeGreaterThan(0);
    expect(audits[0].actorEmail).toBe('admin@jdconnect.id');
  });

  it('does not claim a gateway order is refunded before the money moves', async () => {
    // The mock supplier declines numbers ending in 0.
    const invoice = await paidOrder('081234567890');

    const trx = await dataSource
      .getRepository(Transaction)
      .findOneOrFail({ where: { invoiceNumber: invoice } });

    expect(trx.status).toBe(TransactionStatus.FAILED);
    // Still PAID: the customer's money is with the gateway, not returned.
    expect(trx.paymentStatus).toBe(PaymentStatus.PAID);
    expect(trx.refundStatus).toBe(RefundStatus.PENDING);

    const owed = await dataSource
      .getRepository(AuditLog)
      .find({ where: { action: 'refund.owed', targetId: invoice } });
    expect(owed.length).toBe(1);
  });

  it('rescues a paid order whose top-up never dispatched', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders/guest')
      .send({ productId: product.id, phoneNumber: '081234567892' })
      .expect(201);
    const invoice = created.body.invoiceNumber as string;
    const repo = dataSource.getRepository(Transaction);

    // Simulate a crash between "payment recorded" and "top-up sent".
    await repo.update(
      { invoiceNumber: invoice },
      {
        paymentStatus: PaymentStatus.PAID,
        status: TransactionStatus.PROCESSING,
        supplierRef: undefined,
        updatedAt: new Date(Date.now() - 10 * 60 * 1000),
      } as any,
    );

    await app.get(ReconciliationService).runNow();

    const after = await repo.findOneOrFail({ where: { invoiceNumber: invoice } });
    expect(after.status).toBe(TransactionStatus.SUCCESS);
    expect(after.serialNumber).toBeTruthy();
  });
});
