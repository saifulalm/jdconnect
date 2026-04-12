import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { User } from './../src/user/entities/user.entity';
import { BalanceHistory } from './../src/user/entities/balance-history.entity';
import { Role } from './../src/auth/roles/role.enum';

describe('Admin topup (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows admin to topup customer and writes audit trail', async () => {
    const ts = Date.now();
    const adminEmail = `admin_${ts}@jdconnect.local`;
    const customerEmail = `cust_${ts}@jdconnect.local`;
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password, name: 'Admin User', phone: '081234567890' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: customerEmail, password, name: 'Customer User', phone: '081234567891' })
      .expect(201);

    const adminUser = await dataSource.getRepository(User).findOneOrFail({ where: { email: adminEmail } });
    await dataSource.getRepository(User).update({ id: adminUser.id }, { role: Role.ADMIN });

    const customerUser = await dataSource.getRepository(User).findOneOrFail({ where: { email: customerEmail } });

    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password })
      .expect(201);
    const adminToken = loginAdmin.body.access_token;

    const loginCustomer = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: customerEmail, password })
      .expect(201);
    const customerToken = loginCustomer.body.access_token;

    await request(app.getHttpServer())
      .post('/admin/topup')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ userId: customerUser.id, amount: 50000, description: 'test' })
      .expect(403);

    const beforeCount = await dataSource.getRepository(BalanceHistory).count({ where: { userId: customerUser.id } });

    const topupRes = await request(app.getHttpServer())
      .post('/admin/topup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: customerUser.id, amount: 50000, description: 'test' })
      .expect(201);

    expect(topupRes.body.status).toBe('success');

    const afterCustomer = await dataSource.getRepository(User).findOneOrFail({ where: { id: customerUser.id } });
    expect(Number(afterCustomer.balance)).toBe(50000);

    const afterCount = await dataSource.getRepository(BalanceHistory).count({ where: { userId: customerUser.id } });
    expect(afterCount).toBe(beforeCount + 1);
  });
});

