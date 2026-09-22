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

@Module({
  imports: [
    TrackingModule, QrModule,
    PrismaModule,
    AuthModule,
    AfroMessageModule,
  ],
  controllers: [OrdersController, ReceiverLinkController],
  providers: [
    OrdersService,
    PricingService,
    TrackingNumberService,
    ReceiverLinksService,
  ],
  exports: [OrdersService, PricingService, ReceiverLinksService],
})
export class OrdersModule {}
