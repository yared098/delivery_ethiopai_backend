import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';

export class ScanQrDto {
  /**
   * The scanned QR code content.
   * Can be:
   * - Full QR URL (e.g., http://localhost:5173/q/ETH-2026-A1B2C3?s=6a1f2b)
   * - Public tracking URL (e.g., https://deliver.et/t/32hexToken?s=6a1f2b)
   * - Tracking number (e.g., ETH-2026-A1B2C3)
   * - Tracking number with signature (e.g., ETH-2026-A1B2C3?s=6a1f2b)
   * - Internal Order ID (cuid)
   */
  @IsOptional()
  @IsString()
  code?: string;

  /**
   * Alias for code.
   */
  @IsOptional()
  @IsString()
  qrPayload?: string;

  /**
   * Explicit tracking number if already parsed by mobile app.
   */
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  /**
   * HMAC signature (from ?s=... parameter if parsed separately).
   */
  @IsOptional()
  @IsString()
  signature?: string;

  /**
   * Current courier latitude at time of scan.
   */
  @IsOptional()
  @IsNumber()
  lat?: number;

  /**
   * Current courier longitude at time of scan.
   */
  @IsOptional()
  @IsNumber()
  lng?: number;

  /**
   * Optional action:
   * - 'assign' (default): assign / reassign order to courier
   * - 'pickup': assign / reassign and immediately set status to PICKED_UP
   */
  @IsOptional()
  @IsIn(['assign', 'pickup', 'scan'])
  action?: 'assign' | 'pickup' | 'scan';
}
