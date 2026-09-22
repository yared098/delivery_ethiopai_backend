import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  ValidateNested,
  Matches,
  Length,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemType, PaymentParty } from '@prisma/client';

export class CreateOrderItemDto {
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;

  @IsString()
  @Length(2, 255, { message: 'Item name must be at least 2 characters' })
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0.01, { message: 'Weight must be greater than 0' })
  weightKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeL?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValue?: number;

  @IsOptional()
  @IsBoolean()
  isFragile?: boolean;

  @IsOptional()
  @IsBoolean()
  isRefrigerated?: boolean;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class SenderDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Matches(/^(\+?251|0)?9\d{8}$/, { message: 'Invalid Ethiopian phone' })
  phone: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class ReceiverDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsString()
  @Matches(/^(\+?251|0)?9\d{8}$/, { message: 'Invalid Ethiopian phone' })
  phone: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => SenderDto)
  sender: SenderDto;

  @ValidateNested()
  @Type(() => ReceiverDto)
  receiver: ReceiverDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  originBranchId?: string;

  @IsOptional()
  @IsString()
  destBranchId?: string;

  @IsOptional()
  @IsString()
  packageDescription?: string;

  @IsOptional()
  @IsEnum(PaymentParty)
  paymentParty?: PaymentParty;

  @IsOptional()
  @IsBoolean()
  sendReceiverLink?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  courierId?: string;

  @IsOptional()
  @IsBoolean()
  autoAssignCourier?: boolean;
}
