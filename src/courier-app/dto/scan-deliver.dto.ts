import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class ScanDeliverDto {
  /**
   * Scanned QR code or tracking number at delivery.
   */
  @IsOptional()
  @IsString()
  code?: string;

  /**
   * HMAC signature if present.
   */
  @IsOptional()
  @IsString()
  signature?: string;

  /**
   * Delivery GPS coordinates.
   */
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  /**
   * Optional delivery confirmation OTP.
   */
  @IsOptional()
  @IsString()
  deliveryOtp?: string;

  /**
   * Receiver confirmation flag.
   */
  @IsOptional()
  @IsBoolean()
  receiverConfirmed?: boolean;

  /**
   * Optional proof photo URL.
   */
  @IsOptional()
  @IsString()
  deliveryPhotoUrl?: string;

  /**
   * Optional receiver signature URL.
   */
  @IsOptional()
  @IsString()
  deliverySignatureUrl?: string;
}
