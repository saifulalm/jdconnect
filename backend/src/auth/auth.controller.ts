import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { OtpLoginDto } from './dto/otp-login.dto';
import { OtpService } from '../otp/otp.service';
import { OtpPurpose } from '../otp/entities/otp.entity';
import { UserService } from '../user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly userService: UserService,
  ) {}

  /**
   * Passwordless sign-in: prove the registered phone number with an OTP.
   * Deliberately does not create accounts — guests use POST /orders/claim.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('otp/login')
  async otpLogin(@Body() dto: OtpLoginDto) {
    await this.otpService.verify(dto.phoneNumber, dto.code, OtpPurpose.LOGIN);
    const user = await this.userService.findByPhone(dto.phoneNumber);
    if (!user) {
      throw new UnauthorizedException('Nomor belum terdaftar. Daftar atau klaim pesanan dulu.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Akun dinonaktifkan. Hubungi admin.');
    }
    return this.authService.login(user);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Brute-force protection: password login had no limit at all.
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }
}
