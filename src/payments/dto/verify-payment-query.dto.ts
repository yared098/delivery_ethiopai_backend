import { IsString } from 'class-validator';

export class VerifyPaymentQueryDto {
  @IsString()
  tx_ref: string;
}