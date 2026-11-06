import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../../orders/orders.module';
import { TelegramModule } from '../telegram.module';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramAccountHandler } from './handlers/account.handler';
import { TelegramOrdersHandler } from './handlers/orders.handler';
import { TelegramTrackingHandler } from './handlers/tracking.handler';

/**
 * Interactive Telegram bot. Depends on OrdersModule because order creation
 * goes through OrdersService (pricing, receiver links, SMS, notifications).
 */
@Module({
  imports: [ConfigModule, PrismaModule, TelegramModule, OrdersModule],
  controllers: [TelegramBotController],
  providers: [
    TelegramBotService,
    TelegramAccountHandler,
    TelegramOrdersHandler,
    TelegramTrackingHandler,
  ],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
