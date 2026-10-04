import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentProvidersService } from '../payment-providers/payment-providers.service';
import { InitChapaPaymentDto } from './dto/init-chapa-payment.dto';
import { AnyAuthGuard } from '../common/guards/any-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(
    private payments: PaymentsService,
    private providers: PaymentProvidersService,
  ) {}

  /**
   * ══════════════════════════════════════════════
   * PUBLIC — List enabled providers
   * ══════════════════════════════════════════════
   * Used by customer app, courier app, public checkout.
   */
  @Public()
  @Get('providers')
  listEnabledProviders() {
    return this.providers.findEnabled();
  }

  /**
   * ══════════════════════════════════════════════
   * AUTH — Init Chapa payment
   * ══════════════════════════════════════════════
   * Accepts CUSTOMER, STAFF, or COURIER token
   */
  @UseGuards(AnyAuthGuard)
  @Post('chapa/init')
  initChapa(
    @Body() dto: InitChapaPaymentDto,
    @Req() req: any,
  ) {
    const payerId =
      req.customer?.id || req.staff?.id || req.courier?.id;
    return this.payments.initChapaPayment(dto, payerId);
  }

  /**
   * ══════════════════════════════════════════════
   * PUBLIC — Verify Chapa payment
   * ══════════════════════════════════════════════
   */
  @Public()
  @Get('chapa/verify/:txRef')
  verify(@Param('txRef') txRef: string) {
    return this.payments.verifyChapaPayment(txRef);
  }

  /**
   * ══════════════════════════════════════════════
   * AUTH — List MY payments (history)
   * ══════════════════════════════════════════════
   * Works for CUSTOMER, COURIER, and STAFF.
   *   - Customer → their payments (as sender or receiver)
   *   - Courier  → payments for orders they delivered
   *   - Staff    → their recorded payments
   */
  @UseGuards(AnyAuthGuard)
  @Get('history')
  async listMyPayments(@Req() req: any) {
    if (req.courier) {
      return this.payments.listMyPayments(req.courier.id, 'COURIER');
    }
    if (req.staff) {
      return this.payments.listMyPayments(req.staff.id, 'STAFF');
    }
    if (req.customer) {
      return this.payments.listMyPayments(req.customer.id, 'CUSTOMER');
    }
    return [];
  }
}