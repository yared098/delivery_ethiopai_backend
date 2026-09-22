import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @IsString()
  regionId: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Code must be uppercase letters/digits (e.g. ADA, BFT-1)',
  })
  code: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  woreda?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+?251|0)?9\d{8}$/, { message: 'Invalid phone' })
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
