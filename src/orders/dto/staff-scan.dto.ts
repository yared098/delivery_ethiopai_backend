import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum StaffScanOutAction {
  HANDOVER = 'handover',   // receiver collects at branch → DELIVERED
  DISPATCH = 'dispatch',   // hand to last-mile courier → OUT_FOR_DELIVERY
}

export class StaffScanInDto {
  /** QR URL, tracking number, tracking token, order id, or JSON payload */
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() trackingNumber?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() signature?: string;
  @IsOptional() @IsString() note?: string;

  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
}

export class StaffScanOutDto extends StaffScanInDto {
  @IsOptional()
  @IsEnum(StaffScanOutAction)
  action?: StaffScanOutAction;

  /** If action = dispatch, the courier to hand off to */
  @IsOptional() @IsString() courierId?: string;
}
