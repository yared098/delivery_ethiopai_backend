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
    private providers: PaymentProvidersService,   // ← ADD THIS
  ) {}

  /**
   * ══════════════════════════════════════════════
   * PUBLIC — List enabled providers
   * ══════════════════════════════════════════════
   * Used by customer app, courier app, public checkout.
   * No auth needed.
   */
  @Public()
  @Get('providers')
  listEnabledProviders() {
    return this.providers.findEnabled();
  }

  /**
   * Init Chapa — accepts CUSTOMER, STAFF, or COURIER token
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

  @Public()
  @Get('chapa/verify/:txRef')
  verify(@Param('txRef') txRef: string) {
    return this.payments.verifyChapaPayment(txRef);
  }
}