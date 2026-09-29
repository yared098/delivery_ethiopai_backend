import { Module } from '@nestjs/common';
import { CourierAppController } from './courier-app.controller';
import { CourierAppService } from './courier-app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CourierAppController],
  providers: [CourierAppService],
  exports: [CourierAppService],
})
export class CourierAppModule {}