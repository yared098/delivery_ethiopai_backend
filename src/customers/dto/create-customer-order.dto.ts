import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemType, PaymentParty } from '@prisma/client';

class SenderDto {
  @IsString() name!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

class ReceiverDto {
  @IsOptional() @IsString() name?: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}

class ItemDto {
  @IsOptional() @IsEnum(ItemType) type?: ItemType;
  @IsString() description!: string;
  @IsNumber() @Min(0) weightKg!: number;
  @IsOptional() @IsNumber() @Min(1) quantity?: number;
  @IsOptional() @IsBoolean() isFragile?: boolean;
  @IsOptional() @IsBoolean() isRefrigerated?: boolean;
  @IsOptional() @IsNumber() declaredValue?: number;
}

export class CreateCustomerOrderDto {
  @ValidateNested() @Type(() => SenderDto) sender!: SenderDto;
  @ValidateNested() @Type(() => ReceiverDto) receiver!: ReceiverDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[];

  @IsOptional() @IsString() originBranchId?: string;
  @IsOptional() @IsString() destBranchId?: string;
  @IsOptional() @IsString() packageDescription?: string;
  @IsOptional() @IsEnum(PaymentParty) paymentParty?: PaymentParty;
  @IsOptional() @IsNumber() codAmount?: number;
  @IsOptional() @IsBoolean() sendReceiverLink?: boolean;
}