import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { OtpModule } from '../otp/otp.module';
import { ApiNonce } from './entities/api-nonce.entity';
import { NonceService } from './nonce.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // No fallback: validateEnv() fails the boot when this is missing.
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '24h') as any },
      }),
    }),
    UserModule,
    OtpModule,
    TypeOrmModule.forFeature([ApiNonce]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, NonceService],
  exports: [AuthService, NonceService],
})
export class AuthModule {}
