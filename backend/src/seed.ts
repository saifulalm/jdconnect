import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UserService } from './user/user.service';
import { ProductService } from './product/product.service';
import { Role } from './auth/roles/role.enum';
import { ProductCategory } from './product/entities/product.entity';
import { BalanceChangeType } from './user/entities/balance-history.entity';

/**
 * Idempotent seed for local testing / demos.
 * Run with: npm run seed
 *
 * Dummy logins:
 *   admin@jdconnect.id / Admin123!   (role: admin)
 *   demo@jdconnect.id  / Demo123!    (role: customer, Rp 1.000.000 balance)
 */
async function bootstrap() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const users = app.get(UserService);
  const products = app.get(ProductService);

  // --- Users ---------------------------------------------------------------
  const dummyUsers = [
    { email: 'admin@jdconnect.id', password: 'Admin123!', name: 'Admin Demo', phone: '081200000001', role: Role.ADMIN },
    { email: 'demo@jdconnect.id', password: 'Demo123!', name: 'Pengguna Demo', phone: '081200000002', role: Role.CUSTOMER },
  ];

  for (const u of dummyUsers) {
    const existing = await users.findByEmail(u.email);
    if (existing) {
      logger.log(`User exists: ${u.email}`);
      continue;
    }
    const created = await users.create(u);
    logger.log(`Created user: ${u.email} / ${u.password} (${u.role})`);
    if (u.role === Role.CUSTOMER) {
      await users.updateBalance(created.id, 1_000_000, BalanceChangeType.ADMIN_ADJUSTMENT, 'seed', 'Initial demo balance');
    }
  }

  // --- Products ------------------------------------------------------------
  const operators: Array<[string, ProductCategory]> = [
    ['Telkomsel', ProductCategory.PULSA],
    ['Indosat', ProductCategory.PULSA],
    ['XL', ProductCategory.PULSA],
    ['Tri', ProductCategory.PULSA],
    ['Smartfren', ProductCategory.PULSA],
  ];
  const denoms = [5000, 10000, 25000, 50000, 100000];

  let created = 0;
  for (const [provider, category] of operators) {
    for (const d of denoms) {
      const sku = `${provider.toUpperCase()}_${d / 1000}K`;
      const all = await products.findAll();
      if (all.some((p) => p.sku === sku)) continue;
      await products.create({
        sku,
        name: `${provider} ${d / 1000}K`,
        category,
        provider,
        denomination: d,
        price: d + 1500, // demo selling price (margin)
        isActive: true,
        description: `Pulsa ${provider} ${d.toLocaleString('id-ID')}`,
      });
      created++;
    }
  }

  // A couple of data + PLN demo products.
  const extras = [
    { sku: 'TELKOMSEL_DATA_2GB', name: 'Telkomsel Data 2GB', category: ProductCategory.DATA, provider: 'Telkomsel', denomination: 2048, price: 22000 },
    { sku: 'XL_DATA_5GB', name: 'XL Data 5GB', category: ProductCategory.DATA, provider: 'XL', denomination: 5120, price: 35000 },
    { sku: 'PLN_20K', name: 'Token PLN 20K', category: ProductCategory.PLN, provider: 'PLN', denomination: 20000, price: 21500 },
    { sku: 'PLN_50K', name: 'Token PLN 50K', category: ProductCategory.PLN, provider: 'PLN', denomination: 50000, price: 51500 },
  ];
  for (const e of extras) {
    const all = await products.findAll();
    if (all.some((p) => p.sku === e.sku)) continue;
    await products.create({ ...e, isActive: true });
    created++;
  }

  logger.log(`Seeded ${created} products`);
  logger.log('Done. Dummy logins: admin@jdconnect.id/Admin123!  demo@jdconnect.id/Demo123!');
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});
