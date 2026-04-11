import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, Min } from 'class-validator';
import { TransactionType, TransactionStatus } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}