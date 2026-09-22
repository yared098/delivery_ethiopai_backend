import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CouriersService } from './couriers.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { ListCouriersQueryDto } from './dto/list-couriers-query.dto';
import { RejectCourierDto } from './dto/reject-courier.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '@prisma/client';

@Controller('admin/couriers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouriersController {
  constructor(private couriers: CouriersService) {}

  @Post()
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  create(@Body() dto: CreateCourierDto, @CurrentUser() user: any) {
    return this.couriers.create(dto, user);
  }

  @Get()
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  findAll(@Query() query: ListCouriersQueryDto, @CurrentUser() user: any) {
    return this.couriers.findAll(query, user);
  }

  @Get(':id')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.couriers.findOne(id, user);
  }

  @Patch(':id')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourierDto,
    @CurrentUser() user: any,
  ) {
    return this.couriers.update(id, dto, user);
  }

  @Post(':id/approve')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.couriers.approve(id, user);
  }

  @Post(':id/reject')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectCourierDto,
    @CurrentUser() user: any,
  ) {
    return this.couriers.reject(id, dto, user);
  }

  @Post(':id/suspend')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  suspend(@Param('id') id: string, @CurrentUser() user: any) {
    return this.couriers.suspend(id, user);
  }

  @Post(':id/reactivate')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  reactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.couriers.reactivate(id, user);
  }
}
