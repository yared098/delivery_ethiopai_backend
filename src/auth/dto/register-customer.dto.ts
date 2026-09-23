import {
  IsString,
  IsOptional,
  IsEmail,
  Length,
  IsNumber,
} from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  @Length(20, 60)
  registrationToken!: string;

  @IsString()
  @Length(2, 100)
  name!: string;

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
