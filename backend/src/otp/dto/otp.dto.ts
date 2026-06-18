import { IsString, IsNotEmpty, IsOptional, IsEnum, Length } from 'class-validator';
import { OtpPurpose } from '../entities/otp.entity';

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEnum(OtpPurpose)
  @IsOptional()
  purpose?: OtpPurpose;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsEnum(OtpPurpose)
  @IsOptional()
  purpose?: OtpPurpose;
}
