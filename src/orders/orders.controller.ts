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
import { IsNumber, IsString } from 'class-validator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { SendReceiverLinkDto } from './dto/send-receiver-link.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '@prisma/client';

class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

class AssignCourierDto {
  @IsString()
  courierId: string;
}

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private orders: OrdersService) {}

  // ══════════════════════════════════════════════════
  // CRUD
  // ══════════════════════════════════════════════════

  @Post()
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: any) {
    return this.orders.create(dto, user);
  }

  @Get()
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  findAll(@Query() query: ListOrdersQueryDto, @CurrentUser() user: any) {
    return this.orders.findAll(query, user);
  }

  @Get(':id')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orders.findOne(id, user);
  }

  @Patch(':id')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.orders.update(id, dto, user);
  }

  // ══════════════════════════════════════════════════
  // COURIER ASSIGNMENT
  // ══════════════════════════════════════════════════

  @Post(':id/assign-courier')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  assignCourier(
    @Param('id') id: string,
    @Body() dto: AssignCourierDto,
    @CurrentUser() user: any,
  ) {
    return this.orders.assignCourier(id, dto.courierId, user);
  }

  @Post(':id/auto-assign')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  autoAssign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orders.autoAssignCourier(id, user);
  }

  @Post(':id/unassign-courier')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  unassignCourier(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orders.unassignCourier(id, user);
  }

  // ══════════════════════════════════════════════════
  // LOCATION / TRACKING
  // ══════════════════════════════════════════════════

  @Post(':id/location')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  updateLocation(
    @Param('id') id: string,
    @Body() dto: LocationDto,
    @CurrentUser() user: any,
  ) {
    return this.orders.updateCourierLocation(id, dto.lat, dto.lng, user);
  }

  // ══════════════════════════════════════════════════
  // RECEIVER LINK
  // ══════════════════════════════════════════════════

  @Post(':id/send-receiver-link')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  sendReceiverLink(
    @Param('id') id: string,
    @Body() dto: SendReceiverLinkDto,
    @CurrentUser() user: any,
  ) {
    return this.orders.sendReceiverLink(id, dto, user);
  }

  // ══════════════════════════════════════════════════
  // CANCEL
  // ══════════════════════════════════════════════════

  @Post(':id/cancel')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orders.cancel(id, user);
  }
}
