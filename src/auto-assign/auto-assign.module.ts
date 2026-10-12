import { Module } from '@nestjs/common';
import { AutoAssignService } from './auto-assign.service';
import { AutoAssignController } from './auto-assign.controller';
import { AutoAssignCron } from './auto-assign.cron';
import { OfferStoreService } from './offer-store.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TrackingModule } from '../tracking/tracking.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, TrackingModule, NotificationsModule],
  controllers: [AutoAssignController],
  providers: [AutoAssignService, OfferStoreService, AutoAssignCron],
  exports: [AutoAssignService],
})
export class AutoAssignModule {}