import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Product, ProductCategory } from './../src/product/entities/product.entity';

describe('Guest checkout pipeline (e2e)', () => {
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

    // Seed a product whose SKU number does NOT end in 0 -> mock supplier succeeds.
    const repo = dataSource.getRepository(Product);
    product = await repo.save(
      repo.create({
        sku: 'TELKOMSEL_10K',
        name: 'Telkomsel 10K',
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

  it('exposes a public product catalog', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('runs guest order -> mock pay -> supplier topup -> success', async () => {
    // 1. Create a loginless order (gateway = mock).
    const create = await request(app.getHttpServer())
      .post('/orders/guest')
      .send({ productId: product.id, phoneNumber: '081234567891' })
      .expect(201);

    const invoice = create.body.invoiceNumber as string;
    expect(invoice).toMatch(/^INV/);
    expect(create.body.paymentStatus).toBe('pending');
    expect(create.body.payment.gateway).toBe('mock');

    // 2. Settle payment via mock-pay (simulates Midtrans webhook).
    await request(app.getHttpServer()).post(`/payment/mock-pay/${invoice}`).expect(201);

    // 3. Track the order — should be paid + topup success with an SN.
    const track = await request(app.getHttpServer())
      .get(`/orders/track/${invoice}?phone=7891`)
      .expect(200);

    expect(track.body.paymentStatus).toBe('paid');
    expect(track.body.status).toBe('success');
    expect(track.body.serialNumber).toBeTruthy();
  });

  it('rejects tracking with the wrong phone digits', async () => {
    const create = await request(app.getHttpServer())
      .post('/orders/guest')
      .send({ productId: product.id, phoneNumber: '081234567891' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/orders/track/${create.body.invoiceNumber}?phone=0000`)
      .expect(400);
  });
});
