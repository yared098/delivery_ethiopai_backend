import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramApiService } from './telegram-api.service';
import { TelegramSessionService } from './telegram-session.service';
import { TelegramNotifierService } from './telegram-notifier.service';

/**
 * Core Telegram module: HTTP client, conversation state and outbound pushes.
 * It deliberately does NOT depend on OrdersModule so that OrdersModule /
 * NotificationsModule can import it without creating a cycle. The interactive
 * bot lives in TelegramBotModule.
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [TelegramApiService, TelegramSessionService, TelegramNotifierService],
  exports: [TelegramApiService, TelegramSessionService, TelegramNotifierService],
})
export class TelegramModule {}
