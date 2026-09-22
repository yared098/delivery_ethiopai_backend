import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';

@Module({
  imports: [ConfigModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
