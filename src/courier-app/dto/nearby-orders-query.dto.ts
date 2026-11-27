import {
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class NearbyOrdersQueryDto {
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lat: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(10)
  @Transform(({ value }) => (value ? parseFloat(value) : 10))
  radius?: number; // search radius in km, capped at 10 km

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  limit?: number;
}
