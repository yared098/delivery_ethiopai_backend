import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private admin: AdminService) {}

  // ──────────────────────────────────────────────
  // CREATE STAFF — Super Admin only
  // ──────────────────────────────────────────────

  @Post('users/regional-admin')
  @Roles(Role.SUPER_ADMIN)
  createRegionalAdmin(
    @Body() dto: CreateStaffDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.admin.createStaff(
      { ...dto, role: Role.REGIONAL_ADMIN },
      userId,
    );
  }

  @Post('users/branch-manager')
  @Roles(Role.SUPER_ADMIN, Role.REGIONAL_ADMIN)
  createBranchManager(
    @Body() dto: CreateStaffDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.admin.createStaff(
      { ...dto, role: Role.BRANCH_MANAGER },
      userId,
    );
  }

  @Post('users/courier')
  @Roles(Role.SUPER_ADMIN, Role.REGIONAL_ADMIN, Role.BRANCH_MANAGER)
  createCourier(
    @Body() dto: CreateStaffDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.admin.createStaff({ ...dto, role: Role.COURIER }, userId);
  }

  // ──────────────────────────────────────────────
  // LIST / GET / UPDATE / DEACTIVATE
  // ──────────────────────────────────────────────

  @Get('users')
  @Roles(Role.SUPER_ADMIN, Role.REGIONAL_ADMIN)
  listUsers(@Query() query: ListUsersQueryDto, @CurrentUser() user: any) {
    return this.admin.listUsers(query, user);
  }

  @Get('users/:id')
  @Roles(Role.SUPER_ADMIN, Role.REGIONAL_ADMIN)
  getUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.admin.getUser(id, user);
  }

  @Patch('users/:id')
  @Roles(Role.SUPER_ADMIN, Role.REGIONAL_ADMIN)
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.admin.updateUser(id, dto, user);
  }

  @Delete('users/:id')
  @Roles(Role.SUPER_ADMIN, Role.REGIONAL_ADMIN)
  deactivateUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.admin.deactivateUser(id, user);
  }
}
