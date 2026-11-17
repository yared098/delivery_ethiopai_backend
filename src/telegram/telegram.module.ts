import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramApiService } from './telegram-api.service';
import { TelegramSessionService } from './telegram-session.service';
import { TelegramNotifierService } from './telegram-notifier.service';
import { TelegramAccountLinkService } from './telegram-account-link.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    TelegramApiService,
    TelegramSessionService,
    TelegramNotifierService,
    TelegramAccountLinkService,
  ],
  exports: [
    TelegramApiService,
    TelegramSessionService,
    TelegramNotifierService,
    TelegramAccountLinkService,
  ],
})
export class TelegramModule {}