import { IsOptional, IsString, MinLength } from 'class-validator';

export class ConfirmDeliveryDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsOptional()
  @IsString()
  signature?: string;
}
