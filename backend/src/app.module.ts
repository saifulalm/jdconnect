import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute
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
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
