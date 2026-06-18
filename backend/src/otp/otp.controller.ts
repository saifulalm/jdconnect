import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { OtpPurpose } from './entities/otp.entity';

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('request')
  async request(@Body() dto: RequestOtpDto) {
    return this.otpService.request(dto.phoneNumber, dto.purpose ?? OtpPurpose.LOGIN);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify')
  async verify(@Body() dto: VerifyOtpDto) {
    const valid = await this.otpService.verify(
      dto.phoneNumber,
      dto.code,
      dto.purpose ?? OtpPurpose.LOGIN,
    );
    return { valid };
  }
}
