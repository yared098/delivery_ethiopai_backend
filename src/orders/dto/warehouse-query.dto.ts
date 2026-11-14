import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class WarehouseQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() branchId?: string;

  /** 'in' = currently in warehouse, 'out' = already released, 'all' = both */
  @IsOptional() @IsIn(['in', 'out', 'all']) state?: 'in' | 'out' | 'all';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class WarehouseHistoryQueryDto extends WarehouseQueryDto {
  /** ISO date — only show events after this */
  @IsOptional() @IsString() from?: string;
  /** ISO date — only show events before this */
  @IsOptional() @IsString() to?: string;
}