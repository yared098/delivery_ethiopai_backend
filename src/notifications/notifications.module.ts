import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { firebaseProvider } from './firebase.provider';
import { PrismaModule } from '../prisma/prisma.module';

@Global() // ← injectable everywhere without re-importing
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [firebaseProvider, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}