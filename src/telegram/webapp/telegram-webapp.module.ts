import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../../orders/orders.module';
import { TelegramWebAppService } from './telegram-webapp.service';
import { TelegramWebAppController } from './telegram-webapp.controller';

@Module({
  imports: [ConfigModule, PrismaModule, OrdersModule],
  controllers: [TelegramWebAppController],
  providers: [TelegramWebAppService],
  exports: [TelegramWebAppService],
})
export class TelegramWebAppModule {}
