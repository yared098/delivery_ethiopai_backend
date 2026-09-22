import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaymentProviderType } from '@prisma/client';

export class ListProvidersQueryDto {
  @IsOptional()
  @IsEnum(PaymentProviderType)
  type?: PaymentProviderType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
