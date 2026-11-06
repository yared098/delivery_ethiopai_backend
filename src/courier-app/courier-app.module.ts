import { Module } from '@nestjs/common';
import { CourierAppController } from './courier-app.controller';
import { CourierAppService } from './courier-app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { QrModule } from '../qr/qr.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [PrismaModule, AuthModule, QrModule, TrackingModule],
  controllers: [CourierAppController],
  providers: [CourierAppService],
  exports: [CourierAppService],
})
export class CourierAppModule {}
