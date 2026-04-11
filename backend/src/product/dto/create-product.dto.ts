import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsEnum } from 'class-validator';
import { ProductCategory } from '../entities/product.entity';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsNumber()
  @IsPositive()
  denomination: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
