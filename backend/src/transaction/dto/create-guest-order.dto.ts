import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches } from 'class-validator';

export class CreateGuestOrderDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  // Indonesian MSISDN / customer number (PLN id, etc.)
  @IsString()
  @Matches(/^[0-9]{4,16}$/, { message: 'phoneNumber must be 4-16 digits' })
  phoneNumber: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerName?: string;
}
