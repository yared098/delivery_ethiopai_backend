import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { ChapaService } from './chapa.service';
import { PaymentsController } from './payments.controller';
import { ChapaWebhookController } from './chapa-webhook.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module';  // ← ADD
import { AnyAuthGuard } from '../common/guards/any-auth.guard';

@Module({
  imports: [
    PrismaModule,
    PaymentProvidersModule,       // ← ADD this
    ConfigModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET,
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [
    PaymentsController,
    ChapaWebhookController,
    AdminPaymentsController,
  ],
  providers: [PaymentsService, ChapaService, AnyAuthGuard],
  exports: [PaymentsService, ChapaService],
})
export class PaymentsModule {}