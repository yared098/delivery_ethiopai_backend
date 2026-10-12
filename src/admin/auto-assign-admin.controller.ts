import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AssignCourierDto } from './dto/assign-courier.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutoAssignAdminController {
  constructor(private admin: AdminService) {}

  // ── Retry auto-assign for a stuck order ──
  @Post('orders/:id/retry-auto-assign')
  @StaffRoles(
    StaffRole.SUPER_ADMIN,
    StaffRole.REGIONAL_ADMIN,
    StaffRole.BRANCH_MANAGER,
  )
  retryAutoAssign(@Param('id') id: string, @CurrentUser() user: any) {
    return this.admin.retryAutoAssign(id, user.id);
  }

  // ── Manually assign a courier ──
  @Post('orders/:id/assign-courier')
  @StaffRoles(
    StaffRole.SUPER_ADMIN,
    StaffRole.REGIONAL_ADMIN,
    StaffRole.BRANCH_MANAGER,
  )
  assignCourier(
    @Param('id') id: string,
    @Body() dto: AssignCourierDto,
    @CurrentUser() user: any,
  ) {
    return this.admin.assignCourier(id, dto.courierId, user.id, dto.note);
  }

  // ── List unassigned orders ──
  @Get('orders/unassigned')
  @StaffRoles(
    StaffRole.SUPER_ADMIN,
    StaffRole.REGIONAL_ADMIN,
    StaffRole.BRANCH_MANAGER,
  )
  listUnassigned(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.admin.listUnassignedOrders(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ── List offers for an order ──
  @Get('orders/:id/offers')
  @StaffRoles(
    StaffRole.SUPER_ADMIN,
    StaffRole.REGIONAL_ADMIN,
    StaffRole.BRANCH_MANAGER,
  )
  listOffers(@Param('id') id: string) {
    return this.admin.listOrderOffers(id);
  }

  // ── Auto-assign stats ──
  @Get('auto-assign/stats')
  @StaffRoles(
    StaffRole.SUPER_ADMIN,
    StaffRole.REGIONAL_ADMIN,
    StaffRole.BRANCH_MANAGER,
  )
  getAutoAssignStats() {
    return this.admin.getAutoAssignStats();
  }
}