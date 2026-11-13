import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Matches,
  Length,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WebAppCreateOrderDto {
  /** Telegram Mini App initData (sent as Authorization: tma <initData>) */
  // validated in service, not DTO

  /** Receiver */
  @IsString()
  @Length(2, 100)
  receiverName: string;

  @IsString()
  @Matches(/^(\+?251|0)?9\d{8}$/, { message: 'Invalid Ethiopian phone' })
  receiverPhone: string;

  /** Item */
  @IsString()
  @Length(2, 255)
  itemDescription: string;

  @IsNumber()
  @Min(0.01)
  @Max(5000)
  @Type(() => Number)
  weightKg: number;

  /** Sender location (optional — shared via browser geolocation) */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  senderLat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  senderLng?: number;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  senderAddress?: string;

  /** Who pays */
  @IsOptional()
  @IsIn(['SENDER', 'RECEIVER'])
  paymentParty?: 'SENDER' | 'RECEIVER';

  /** Optional photo URL (uploaded via /api/v1/uploads) */
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
