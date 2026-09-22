import {
  IsString,
  IsOptional,
  IsEmail,
  Matches,
  Length,
  IsNumber,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @Matches(/^(\+?251|0)?9\d{8}$/, { message: 'Invalid Ethiopian phone number' })
  phone: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  defaultAddress?: string;

  @IsOptional()
  @IsNumber()
  defaultLat?: number;

  @IsOptional()
  @IsNumber()
  defaultLng?: number;
}
