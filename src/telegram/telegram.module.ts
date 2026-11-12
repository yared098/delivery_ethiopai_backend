import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramApiService } from './telegram-api.service';
import { TelegramSessionService } from './telegram-session.service';
import { TelegramNotifierService } from './telegram-notifier.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [TelegramApiService, TelegramSessionService, TelegramNotifierService],
  exports: [TelegramApiService, TelegramSessionService, TelegramNotifierService],
})
export class TelegramModule {}