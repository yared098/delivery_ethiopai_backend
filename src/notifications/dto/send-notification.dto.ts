import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AccountType } from '@prisma/client';

export class SendNotificationDto {
  @IsEnum(AccountType)
  accountType: AccountType;

  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  data?: Record<string, string>;
}

export class BroadcastNotificationDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  @IsOptional()
  @IsString()
  topic?: string; // e.g. "couriers", "customers", or "branch_xxx"
}