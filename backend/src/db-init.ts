import { Client } from 'pg';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import { AppModule } from './app.module';
import { seedData } from './seed';

/**
 * One-shot initial database setup. Cross-platform — `npm run db:init`.
 *
 *   1. CREATE DATABASE <name> if it does not exist (Postgres).
 *   2. Boot the Nest app with TypeORM synchronize=true to build every table
 *      directly from the entities (always in sync with the code).
 *   3. Seed dummy users + demo products.
 *
 * Skips step 1 when DATABASE_URL is set (managed providers create the DB).
 */
async function createDatabaseIfMissing(logger: Logger): Promise<void> {
  if (process.env.DATABASE_URL) {
    logger.log('DATABASE_URL set — skipping CREATE DATABASE (managed by provider)');
    return;
  }

  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 5432);
  const user = process.env.DB_USERNAME || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_DATABASE || 'pulsa';

  // Connect to the maintenance DB to issue CREATE DATABASE.
  const client = new Client({ host, port, user, password, database: 'postgres' });
  await client.connect();
  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (exists.rowCount && exists.rowCount > 0) {
      logger.log(`Database "${database}" already exists`);
    } else {
      // Identifier can't be parameterized; database name comes from env, not user input.
      await client.query(`CREATE DATABASE "${database.replace(/"/g, '')}"`);
      logger.log(`Created database "${database}"`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  loadEnv();
  const logger = new Logger('DbInit');

  // Force schema build from entities for this run.
  process.env.TYPEORM_SYNC = 'true';

  await createDatabaseIfMissing(logger);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    logger.log('Schema synchronized from entities');
    await seedData(app);
    logger.log('Database initialized successfully ✅');
  } finally {
    await app.close();
  }
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('db:init failed:', err);
  process.exit(1);
});
