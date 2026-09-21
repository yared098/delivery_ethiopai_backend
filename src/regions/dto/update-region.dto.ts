import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateRegionDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 5)
  @Matches(/^[A-Z]+$/)
  code?: string;
}
