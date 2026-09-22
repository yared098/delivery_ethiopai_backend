import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Length,
  Min,
} from 'class-validator';
import { PaymentParty } from '@prisma/client';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  senderName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  senderAddress?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  receiverAddress?: string;

  @IsOptional()
  @IsNumber()
  receiverLat?: number;

  @IsOptional()
  @IsNumber()
  receiverLng?: number;

  @IsOptional()
  @IsString()
  packageDescription?: string;

  @IsOptional()
  @IsEnum(PaymentParty)
  paymentParty?: PaymentParty;

  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;
}
