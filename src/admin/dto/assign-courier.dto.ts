import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignCourierDto {
  @IsString()
  @IsNotEmpty()
  courierId: string;

  @IsOptional()
  @IsString()
  note?: string;
}