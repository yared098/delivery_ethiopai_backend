import {
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsUrl,
  Min,
} from 'class-validator';

export class InitChapaPaymentDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  returnUrl?: string;
}