import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { firebaseProvider } from './firebase.provider';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';

@Global() // ← injectable everywhere without re-importing
@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [NotificationsController],
  providers: [firebaseProvider, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
