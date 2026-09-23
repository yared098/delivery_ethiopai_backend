import { Module } from '@nestjs/common';
import { PublicTrackingController } from './public-tracking.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicTrackingController],
})
export class PublicTrackingModule {}
