import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_-]+$/, { message: 'key must be lowercase alphanumeric' })
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  inputLabel?: string;

  @IsString()
  @IsOptional()
  inputPlaceholder?: string;

  @IsString()
  @IsOptional()
  inputHelp?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  minLength?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxLength?: number;

  @IsBoolean()
  @IsOptional()
  detectOperator?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresServerId?: boolean;

  @IsString()
  @IsOptional()
  serverIdLabel?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  inputLabel?: string;

  @IsString()
  @IsOptional()
  inputPlaceholder?: string;

  @IsString()
  @IsOptional()
  inputHelp?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  minLength?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxLength?: number;

  @IsBoolean()
  @IsOptional()
  detectOperator?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresServerId?: boolean;

  @IsString()
  @IsOptional()
  serverIdLabel?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreatePrefixDto {
  @IsString()
  @Matches(/^0?\d{2,6}$/, { message: 'prefix must be 2-6 digits' })
  prefix: string;

  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePrefixDto {
  @IsString()
  @Matches(/^0?\d{2,6}$/, { message: 'prefix must be 2-6 digits' })
  @IsOptional()
  prefix?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
