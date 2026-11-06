import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { TelegramUpdate } from '../telegram-api.service';
import { TelegramBotService } from './telegram-bot.service';

/**
 * Webhook receiver used when TELEGRAM_POLLING is not enabled.
 * Telegram retries on non-2xx, so failures are swallowed inside the bot
 * service and this handler always answers 200.
 */
@Controller('telegram')
export class TelegramBotController {
  constructor(private readonly bot: TelegramBotService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() update: TelegramUpdate): Promise<{ ok: true }> {
    if (update && typeof update.update_id === 'number') {
      await this.bot.handleUpdate(update);
    }
    return { ok: true };
  }
}
