import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AfroMessageModule } from './integrations/afromessage/afromessage.module';
import { StaffModule } from './staff/staff.module';
import { AuthModule } from './auth/auth.module';
import { RegionsModule } from './regions/regions.module';
import { BranchesModule } from './branches/branches.module';
import { AdminModule } from './admin/admin.module';
import { CouriersModule } from './couriers/couriers.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { TrackingModule } from './tracking/tracking.module';
import { QrModule } from './qr/qr.module';
import { UploadsModule } from './uploads/uploads.module';
import { PaymentProvidersModule } from './payment-providers/payment-providers.module';
import { CustomerOrdersModule } from './customer-orders/customer-orders.module';
import { PublicTrackingModule } from './public-tracking/public-tracking.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AfroMessageModule,
    StaffModule,
    AuthModule,
    RegionsModule,
    BranchesModule,
    AdminModule,
    CouriersModule,
    CustomersModule,
    OrdersModule,
    TrackingModule,
    QrModule,
    UploadsModule,
    PaymentProvidersModule,
    CustomerOrdersModule,
    PublicTrackingModule,
    NotificationsModule
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
