import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '@prisma/client';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPaymentsController {
  constructor(private payments: PaymentsService) {}

  // ─── Existing ───
  @Get('order/:orderId')
  @StaffRoles(
    StaffRole.SUPER_ADMIN,
    StaffRole.REGIONAL_ADMIN,
    StaffRole.BRANCH_MANAGER,
  )
  listForOrder(@Param('orderId') orderId: string) {
    return this.payments.listOrderPayments(orderId);
  }

 @Post(':id/refund')
@StaffRoles(StaffRole.SUPER_ADMIN)
refund(
  @Param('id') id: string,
  @Body() body: { reason: string; amount?: number },
  @Req() req: any,
) {
  // Extract ID from multiple possible places
  const staffId =
    req.staff?.id ||
    req.user?.sub ||
    req.user?.id;

  console.log('🔍 refund staffId:', staffId, 'req.user:', req.user);

  return this.payments.markRefunded(
    id,
    body.reason,
    body.amount,
    staffId,
  );
}

  // ══════════════════════════════════════════════
  // NEW — List ALL payments (admin transactions)
  // ══════════════════════════════════════════════
  @Get()
  @StaffRoles(
    StaffRole.SUPER_ADMIN,
    StaffRole.REGIONAL_ADMIN,
    StaffRole.BRANCH_MANAGER,
  )
  listAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.payments.listAllPayments({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      status,
      method,
      search,
      from,
      to,
    });
  }

  // ══════════════════════════════════════════════
  // NEW — Stats for dashboard
  // ══════════════════════════════════════════════
  @Get('stats')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  stats() {
    return this.payments.getPaymentStats();
  }
}