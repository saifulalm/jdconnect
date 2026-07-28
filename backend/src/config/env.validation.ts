import { Logger } from '@nestjs/common';

/**
 * Startup env validation. Fails fast instead of booting with unsafe defaults —
 * a missing JWT_SECRET previously fell back to a value committed to the repo.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const logger = new Logger('EnvValidation');
  const isProd = config.NODE_ENV === 'production';
  const isTest = config.NODE_ENV === 'test';
  const errors: string[] = [];
  const warnings: string[] = [];

  const jwtSecret = String(config.JWT_SECRET ?? '');
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required — refusing to start without it.');
  } else if (jwtSecret.length < 32 && isProd) {
    errors.push('JWT_SECRET must be at least 32 characters in production.');
  } else if (['default-secret', 'secret', 'changeme'].includes(jwtSecret.toLowerCase())) {
    errors.push('JWT_SECRET uses a well-known placeholder value.');
  }

  if (isProd) {
    if (!config.DATABASE_URL && !config.DB_HOST) {
      errors.push('DATABASE_URL or DB_HOST is required in production.');
    }
    if (config.TYPEORM_SYNC === 'true') {
      errors.push('TYPEORM_SYNC must be false in production — use migrations.');
    }

    // A payment driver must be explicitly chosen; the mock gateway settles
    // orders without money changing hands.
    if (!config.MIDTRANS_SERVER_KEY && !config.QRIS_STATIC_CODE) {
      errors.push(
        'No payment driver configured (MIDTRANS_SERVER_KEY or QRIS_STATIC_CODE) — ' +
          'the mock gateway must never run in production.',
      );
    }

    // Supplier callbacks are only trustworthy when their signature can be checked.
    if (config.DIGIFLAZZ_USERNAME && !config.DIGIFLAZZ_WEBHOOK_SECRET) {
      errors.push(
        'DIGIFLAZZ_WEBHOOK_SECRET is required when Digiflazz is configured — ' +
          'callbacks cannot be verified without it.',
      );
    }
  }

  if (!isProd && !isTest) {
    if (!config.MIDTRANS_SERVER_KEY && !config.QRIS_STATIC_CODE) {
      warnings.push('No payment gateway configured — running with the mock gateway.');
    }
  }

  warnings.forEach((w) => logger.warn(w));

  if (errors.length) {
    errors.forEach((e) => logger.error(e));
    throw new Error(
      `Environment validation failed:\n  - ${errors.join('\n  - ')}\n` +
        'Fix backend/.env (see .env.example) and restart.',
    );
  }

  return config;
}
