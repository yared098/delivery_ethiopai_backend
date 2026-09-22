import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AdminService } from './admin.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '@prisma/client';

class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

@Controller('admin/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Post('regional-admin')
  @StaffRoles(StaffRole.SUPER_ADMIN)
  createRegionalAdmin(@Body() dto: CreateStaffDto, @CurrentUser() user: any) {
    return this.admin.createStaff(dto, StaffRole.REGIONAL_ADMIN, user);
  }

  @Post('branch-manager')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  createBranchManager(@Body() dto: CreateStaffDto, @CurrentUser() user: any) {
    return this.admin.createStaff(dto, StaffRole.BRANCH_MANAGER, user);
  }

  @Get()
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  listStaff(@Query() query: ListStaffQueryDto, @CurrentUser() user: any) {
    return this.admin.listStaff(query, user);
  }

  @Get(':id')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  getStaff(@Param('id') id: string, @CurrentUser() user: any) {
    return this.admin.getStaff(id, user);
  }

  @Post(':id/suspend')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  suspend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.admin.suspendStaff(id, user);
  }

  @Post(':id/reactivate')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  reactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.admin.reactivateStaff(id, user);
  }

  @Post(':id/reset-password')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: any,
  ) {
    return this.admin.resetPassword(id, dto.password, user);
  }
}
