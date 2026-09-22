import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { PaymentProviderType } from '@prisma/client';

export class CreateProviderDto {
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Z0-9_]+$/, { message: 'Code must be uppercase (TELEBIRR)' })
  code: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  description?: string;

  @IsEnum(PaymentProviderType)
  type: PaymentProviderType;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be hex (#00A651)' })
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isTestMode?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feeFixed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  apiSecret?: string;

  @IsOptional()
  @IsString()
  merchantId?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  configJson?: any;
}
