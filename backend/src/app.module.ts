import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { TransactionModule } from './transaction/transaction.module';
import { PaymentModule } from './payment/payment.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';
import { ProductModule } from './product/product.module';
import { TaxModule } from './tax/tax.module';
import { SupplierModule } from './supplier/supplier.module';
import { OtpModule } from './otp/otp.module';
import { CatalogModule } from './catalog/catalog.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    // Per-IP default. Kept generous because many legitimate users share one
    // address behind office NAT or mobile carrier CGNAT — a tight global
    // limit locks out whole networks. Sensitive writes (login, OTP, orders)
    // set their own much stricter limits with @Throttle.
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 300,
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV');

        if (nodeEnv === 'test') {
          return {
            type: 'sqlite' as const,
            database: ':memory:',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            logging: false,
            namingStrategy: new SnakeNamingStrategy(),
          };
        }

        const synchronize = configService.get<string>('TYPEORM_SYNC') === 'true' || nodeEnv === 'development';
        const logging = configService.get<string>('TYPEORM_LOGGING') === 'true' || nodeEnv === 'development';

        const baseConfig = {
          type: 'postgres' as const,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize,
          logging,
          namingStrategy: new SnakeNamingStrategy(),
        };

        if (databaseUrl) {
          return {
            ...baseConfig,
            url: databaseUrl,
            ssl: nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
          };
        }

        return {
          ...baseConfig,
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: Number(configService.get<string>('DB_PORT')) || 5432,
          username: configService.get<string>('DB_USERNAME') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') ?? '',
          database: configService.get<string>('DB_DATABASE') || 'pulsa',
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    UserModule,
    AuthModule,
    TransactionModule,
    PaymentModule,
    NotificationModule,
    AdminModule,
    ProductModule,
    TaxModule,
    SupplierModule,
    OtpModule,
    CatalogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Without this the @Throttle decorators across the app are inert — the
    // guard has to be registered for any rate limiting to happen at all.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
