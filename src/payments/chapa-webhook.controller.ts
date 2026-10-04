import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('payments/chapa')
export class ChapaWebhookController {
  constructor(private payments: PaymentsService) {}

  /**
   * Chapa webhook — server-to-server
   * MUST be public (no auth) — Chapa calls this
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Body() body: any) {
    return this.payments.handleChapaWebhook(body);
  }

  /**
   * Chapa callback_url (browser redirect can also hit this)
   */
  @Public()
  @Post('callback')
  @HttpCode(200)
  callback(@Body() body: any) {
    return this.payments.handleChapaWebhook(body);
  }
}