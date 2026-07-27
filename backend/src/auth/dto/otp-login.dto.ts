import { IsString, Length, Matches } from 'class-validator';

export class OtpLoginDto {
  @IsString()
  @Matches(/^[0-9+\-\s()]{9,20}$/, { message: 'phoneNumber is not a valid MSISDN' })
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
