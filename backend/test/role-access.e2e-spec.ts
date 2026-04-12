import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { User } from './../src/user/entities/user.entity';
import { Role } from './../src/auth/roles/role.enum';

describe('Role access (e2e)', () => {
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

  it('blocks customer from admin routes and allows admin after role update', async () => {
    const email = `test_${Date.now()}@jdconnect.local`;
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, name: 'Test User', phone: '081234567890' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const token = loginRes.body.access_token;
    const userId = loginRes.body.user.id;

    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await dataSource.getRepository(User).update({ id: userId }, { role: Role.ADMIN });

    const loginRes2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const token2 = loginRes2.body.access_token;

    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);
  });
});

