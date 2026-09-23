import { IsOptional, IsString, IsNumber, Length } from 'class-validator';
export class UpdateCustomerProfileDto {
  @IsOptional() @IsString() @Length(1, 100) name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() defaultAddress?: string;
  @IsOptional() @IsNumber() defaultLat?: number;
  @IsOptional() @IsNumber() defaultLng?: number;
}
