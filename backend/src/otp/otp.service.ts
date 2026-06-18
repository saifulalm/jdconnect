import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { MoreThan, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { OtpCode, OtpPurpose } from './entities/otp.entity';
import { SmsService } from '../notification/sms.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes
  private readonly maxPerHour = 5;
  private readonly maxAttempts = 5;
  private readonly devEcho: boolean;

  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {
    this.devEcho = this.config.get<string>('NODE_ENV') !== 'production';
  }

  private hash(phone: string, code: string): string {
    return crypto.createHash('sha256').update(`${phone}:${code}`).digest('hex');
  }

  private normalize(phone: string): string {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    return p;
  }

  async request(phoneRaw: string, purpose: OtpPurpose = OtpPurpose.LOGIN): Promise<{ sent: boolean; debugCode?: string }> {
    const phone = this.normalize(phoneRaw);
    if (phone.length < 9) throw new BadRequestException('Invalid phone number');

    // Rate limit: max N requests / hour / number.
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.otpRepo.count({
      where: { phoneNumber: phone, createdAt: MoreThan(since) },
    });
    if (recent >= this.maxPerHour) {
      throw new BadRequestException('Too many OTP requests. Try again later.');
    }

    // Invalidate previous active codes for this phone+purpose.
    await this.otpRepo.update(
      { phoneNumber: phone, purpose, consumed: false },
      { consumed: true },
    );

    const code = (crypto.randomInt(0, 1_000_000)).toString().padStart(6, '0');
    await this.otpRepo.save(
      this.otpRepo.create({
        phoneNumber: phone,
        purpose,
        codeHash: this.hash(phone, code),
        expiresAt: new Date(Date.now() + this.ttlMs),
      }),
    );

    const res = await this.sms.sendOtpSms(phone, code);
    if (!res.success) this.logger.warn(`OTP SMS not delivered to ${phone} (service off)`);

    // In dev (or when SMS off) return the code so the flow is testable.
    const debugCode = this.devEcho || !res.success ? code : undefined;
    return { sent: true, debugCode };
  }

  async verify(phoneRaw: string, code: string, purpose: OtpPurpose = OtpPurpose.LOGIN): Promise<boolean> {
    const phone = this.normalize(phoneRaw);
    const otp = await this.otpRepo.findOne({
      where: { phoneNumber: phone, purpose, consumed: false, expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    if (!otp) throw new BadRequestException('OTP expired or not found');
    if (otp.attempts >= this.maxAttempts) {
      await this.otpRepo.update(otp.id, { consumed: true });
      throw new BadRequestException('Too many attempts');
    }
    const ok = otp.codeHash === this.hash(phone, code);
    if (!ok) {
      await this.otpRepo.update(otp.id, { attempts: otp.attempts + 1 });
      throw new BadRequestException('Invalid OTP code');
    }
    await this.otpRepo.update(otp.id, { consumed: true });
    return true;
  }
}
