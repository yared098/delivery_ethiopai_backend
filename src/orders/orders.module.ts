import { AfroMessageModule } from '../integrations/afromessage/afromessage.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PricingService } from './pricing.service';
import { TrackingNumberService } from './tracking-number.service';
import { ReceiverLinksService } from './receiver-links.service';
import { ReceiverLinkController } from '../receiver-links/receiver-link.controller';
import { TrackingModule } from '../tracking/tracking.module';
import { QrModule } from '../qr/qr.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BranchResolverService } from './branch-resolver.service';

@Module({
  imports: [
    // ⚠️ ONLY modules go here — no services, no controllers
    TrackingModule,
    QrModule,
    PrismaModule,
    AuthModule,
    AfroMessageModule,
    NotificationsModule,
  ],
  controllers: [
    OrdersController,
    ReceiverLinkController,
  ],
  providers: [
    // ⚠️ Services and providers go here
    OrdersService,
    PricingService,
    TrackingNumberService,
    ReceiverLinksService,
    BranchResolverService,   // ✅ HERE — not in imports
  ],
  exports: [
    OrdersService,
    PricingService,
    ReceiverLinksService,
    BranchResolverService,
  ],
})
export class OrdersModule {}