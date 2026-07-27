import { NestFactory } from '@nestjs/core';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UserService } from './user/user.service';
import { ProductService } from './product/product.service';
import { Role } from './auth/roles/role.enum';
import { ProductCategory } from './product/entities/product.entity';
import { BalanceChangeType } from './user/entities/balance-history.entity';
import { CatalogService } from './catalog/catalog.service';

/**
 * Idempotent seed for local testing / demos.
 *
 * Dummy logins:
 *   admin@jdconnect.id / Admin123!   (role: admin)
 *   demo@jdconnect.id  / Demo123!    (role: customer, Rp 1.000.000 balance)
 */
export async function seedData(app: INestApplicationContext): Promise<void> {
  const logger = new Logger('Seed');
  const users = app.get(UserService);
  const products = app.get(ProductService);
  const catalog = app.get(CatalogService);

  // --- Storefront categories (admin-editable) --------------------------------
  const existingCategories = await catalog.findAllCategories();
  const categoryKeys = new Set(existingCategories.map((c) => c.key));
  const defaultCategories = [
    {
      key: 'pulsa',
      label: 'Pulsa',
      description: 'Pulsa reguler semua operator',
      icon: 'Smartphone',
      inputLabel: 'Nomor Handphone',
      inputPlaceholder: '0812 3456 7890',
      inputHelp: 'Operator terdeteksi otomatis dari prefix nomor.',
      minLength: 9,
      maxLength: 15,
      detectOperator: true,
      sortOrder: 1,
    },
    {
      key: 'data',
      label: 'Paket Data',
      description: 'Kuota internet harian sampai bulanan',
      icon: 'Wifi',
      inputLabel: 'Nomor Handphone',
      inputPlaceholder: '0812 3456 7890',
      inputHelp: 'Pastikan nomor aktif dan sesuai operator.',
      minLength: 9,
      maxLength: 15,
      detectOperator: true,
      sortOrder: 2,
    },
    {
      key: 'pln',
      label: 'Token PLN',
      description: 'Listrik prabayar 20 digit',
      icon: 'Zap',
      inputLabel: 'ID Pelanggan / No. Meter',
      inputPlaceholder: '1234567890',
      inputHelp: 'Cek 11-12 digit ID pelanggan pada meteran atau struk.',
      minLength: 10,
      maxLength: 13,
      detectOperator: false,
      sortOrder: 3,
    },
    {
      key: 'game',
      label: 'Voucher Game',
      description: 'Diamond, UC, dan voucher game populer',
      icon: 'Gamepad2',
      inputLabel: 'User ID',
      inputPlaceholder: '123456789',
      inputHelp: 'Salin User ID dari profil di dalam game.',
      minLength: 5,
      maxLength: 20,
      detectOperator: false,
      requiresServerId: true,
      serverIdLabel: 'Server / Zone ID',
      sortOrder: 4,
    },
    {
      key: 'ewallet',
      label: 'E-Wallet',
      description: 'Isi saldo dompet digital',
      icon: 'Wallet',
      inputLabel: 'Nomor Terdaftar E-Wallet',
      inputPlaceholder: '0812 3456 7890',
      inputHelp: 'Gunakan nomor yang terdaftar di aplikasi dompet digital.',
      minLength: 9,
      maxLength: 15,
      detectOperator: false,
      sortOrder: 5,
    },
  ];
  let newCategories = 0;
  for (const c of defaultCategories) {
    if (categoryKeys.has(c.key)) continue;
    await catalog.createCategory(c);
    newCategories++;
  }
  logger.log(`Seeded ${newCategories} categories`);

  // --- Operator prefixes (admin-editable) ------------------------------------
  const existingPrefixes = await catalog.findPrefixes();
  const prefixSet = new Set(existingPrefixes.map((p) => p.prefix));
  const prefixMap: Record<string, string[]> = {
    Telkomsel: [
      '0811', '0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853',
    ],
    Indosat: ['0814', '0815', '0816', '0855', '0856', '0857', '0858'],
    XL: ['0817', '0818', '0819', '0859', '0877', '0878'],
    Axis: ['0831', '0832', '0833', '0838'],
    Tri: ['0895', '0896', '0897', '0898', '0899'],
    Smartfren: [
      '0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889',
    ],
  };
  let newPrefixes = 0;
  for (const [provider, list] of Object.entries(prefixMap)) {
    for (const prefix of list) {
      if (prefixSet.has(prefix)) continue;
      await catalog.createPrefix({ prefix, provider });
      newPrefixes++;
    }
  }
  logger.log(`Seeded ${newPrefixes} operator prefixes`);

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
  const existingProducts = await products.findAll();
  const existingSkus = new Set(existingProducts.map((p) => p.sku));

  const operators: Array<[string, ProductCategory]> = [
    ['Telkomsel', ProductCategory.PULSA],
    ['Indosat', ProductCategory.PULSA],
    ['XL', ProductCategory.PULSA],
    ['Tri', ProductCategory.PULSA],
    ['Smartfren', ProductCategory.PULSA],
  ];
  const denoms = [5000, 10000, 25000, 50000, 100000];

  const toCreate: Array<Parameters<ProductService['create']>[0]> = [];
  for (const [provider, category] of operators) {
    for (const d of denoms) {
      const sku = `${provider.toUpperCase()}_${d / 1000}K`;
      if (existingSkus.has(sku)) continue;
      toCreate.push({
        sku,
        name: `${provider} ${d / 1000}K`,
        category,
        provider,
        denomination: d,
        price: d + 1500,
        isActive: true,
        description: `Pulsa ${provider} ${d.toLocaleString('id-ID')}`,
      });
    }
  }

  // Paket data per operator (denomination = MB).
  const dataPlans: Array<[string, string, number, number]> = [
    // provider, label, MB, price
    ['Telkomsel', '1GB / 7 Hari', 1024, 15000],
    ['Telkomsel', '3GB / 30 Hari', 3072, 32000],
    ['Telkomsel', '10GB / 30 Hari', 10240, 75000],
    ['Indosat', '2GB / 7 Hari', 2048, 17000],
    ['Indosat', '5GB / 30 Hari', 5120, 40000],
    ['XL', '3GB / 30 Hari', 3072, 30000],
    ['XL', '8GB / 30 Hari', 8192, 55000],
    ['Tri', '5GB / 30 Hari', 5120, 28000],
    ['Smartfren', '6GB / 30 Hari', 6144, 35000],
  ];

  // Token PLN (denomination = rupiah).
  const plnDenoms = [20000, 50000, 100000, 200000, 500000];

  // Voucher game (denomination = jumlah item in-game).
  const gameItems: Array<[string, string, number, number]> = [
    ['Mobile Legends', '86 Diamonds', 86, 22000],
    ['Mobile Legends', '172 Diamonds', 172, 43000],
    ['Mobile Legends', '429 Diamonds', 429, 105000],
    ['Free Fire', '70 Diamonds', 70, 10000],
    ['Free Fire', '355 Diamonds', 355, 50000],
    ['PUBG Mobile', '60 UC', 60, 15000],
    ['PUBG Mobile', '325 UC', 325, 75000],
    ['Genshin Impact', '60 Genesis Crystals', 60, 16000],
    ['Valorant', '475 VP', 475, 50000],
  ];

  // E-wallet top-up (denomination = rupiah).
  const wallets = ['DANA', 'OVO', 'GoPay', 'ShopeePay', 'LinkAja'];
  const walletDenoms = [20000, 50000, 100000, 200000];

  const extras: Array<Parameters<ProductService['create']>[0]> = [];

  for (const [provider, label, mb, price] of dataPlans) {
    extras.push({
      sku: `${provider.toUpperCase()}_DATA_${mb}MB`,
      name: `${provider} ${label}`,
      category: ProductCategory.DATA,
      provider,
      denomination: mb,
      price,
      description: `Kuota internet ${provider} ${label}`,
    });
  }

  for (const d of plnDenoms) {
    extras.push({
      sku: `PLN_${d / 1000}K`,
      name: `Token PLN ${d / 1000}K`,
      category: ProductCategory.PLN,
      provider: 'PLN',
      denomination: d,
      price: d + 1500,
      description: `Token listrik prabayar Rp ${d.toLocaleString('id-ID')}`,
    });
  }

  for (const [provider, label, qty, price] of gameItems) {
    extras.push({
      sku: `${provider.toUpperCase().replace(/\s+/g, '_')}_${qty}`,
      name: `${provider} ${label}`,
      category: ProductCategory.GAME,
      provider,
      denomination: qty,
      price,
      description: `Top up ${provider} ${label}`,
    });
  }

  for (const provider of wallets) {
    for (const d of walletDenoms) {
      extras.push({
        sku: `${provider.toUpperCase()}_${d / 1000}K`,
        name: `${provider} ${d / 1000}K`,
        category: ProductCategory.EWALLET,
        provider,
        denomination: d,
        price: d + 2000,
        description: `Saldo ${provider} Rp ${d.toLocaleString('id-ID')}`,
      });
    }
  }
  for (const e of extras) {
    if (e.sku && existingSkus.has(e.sku)) continue;
    toCreate.push({ ...e, isActive: true });
  }

  for (const p of toCreate) await products.create(p);
  logger.log(`Seeded ${toCreate.length} products (existing kept)`);
  logger.log('Dummy logins -> admin@jdconnect.id/Admin123!  |  demo@jdconnect.id/Demo123!');
}

// Allow running standalone: `npm run seed`
if (require.main === module) {
  (async () => {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });
    try {
      await seedData(app);
    } finally {
      await app.close();
    }
    process.exit(0);
  })().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
