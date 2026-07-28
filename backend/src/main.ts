import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  // rawBody is required to verify supplier webhook signatures against the
  // exact bytes received — re-serialising the parsed body changes key order.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Behind a load balancer / Cloudflare the socket address is the proxy's.
  // Without this, req.ip is the proxy for everyone, which silently breaks
  // both the H2H IP whitelist and per-IP rate limiting.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy && trustProxy !== 'false') {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  }

  // Security headers
  app.use(helmet());

  // Enable CORS for frontend
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'https://jdconnect.id,http://localhost:4001,http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Backend running on port ${port}`);
}
bootstrap();
