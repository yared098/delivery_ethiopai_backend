import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
    @CurrentUser() user: any,
  ) {
    return this.payments.markRefunded(
      id,
      body.reason,
      body.amount,
      user.id,
    );
  }
}