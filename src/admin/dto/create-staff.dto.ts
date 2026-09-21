import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  Matches,
  Length,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  @Matches(/^(\+?251|0)?9\d{8}$/, { message: 'Invalid Ethiopian phone number' })
  phone: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(Role, {
    message: 'Role must be one of: REGIONAL_ADMIN, BRANCH_MANAGER, COURIER',
  })
  role: Role;

  @ValidateIf((o) => o.role === Role.REGIONAL_ADMIN || o.role === Role.BRANCH_MANAGER || o.role === Role.COURIER)
  @IsString()
  @IsOptional()
  regionId?: string;

  @ValidateIf((o) => o.role === Role.BRANCH_MANAGER || o.role === Role.COURIER)
  @IsString()
  @IsOptional()
  branchId?: string;
}
