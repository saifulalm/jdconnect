import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

/**
 * Claim guest orders placed with a phone number and attach them to an
 * account, proving ownership of the number with an OTP.
 */
export class ClaimOrdersDto {
  @IsString()
  @Matches(/^[0-9+\-\s()]{9,20}$/, { message: 'phoneNumber is not a valid MSISDN' })
  phoneNumber: string;

  @IsString()
  @Length(6, 6)
  code: string;

  /** Only used when creating a fresh account for this number. */
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;
}
