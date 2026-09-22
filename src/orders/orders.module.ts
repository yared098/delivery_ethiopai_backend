import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PricingService } from './pricing.service';
import { TrackingNumberService } from './tracking-number.service';
import { ReceiverLinksService } from './receiver-links.service';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [TrackingModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    PricingService,
    TrackingNumberService,
    ReceiverLinksService,
  ],
  exports: [OrdersService, PricingService, ReceiverLinksService],
})
export class OrdersModule {}
