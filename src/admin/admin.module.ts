import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AutoAssignAdminController } from './auto-assign-admin.controller'; // 👈 NEW
import { PrismaModule } from '../prisma/prisma.module';                     // 👈 NEW
import { AutoAssignModule } from '../auto-assign/auto-assign.module';       // 👈 NEW

@Module({
  imports: [
    PrismaModule,        // 👈 NEW (needed for PrismaService)
    AutoAssignModule,    // 👈 NEW (needed for AutoAssignService)
  ],
  controllers: [
    AdminController,
    AutoAssignAdminController,   // 👈 NEW
  ],
  providers: [AdminService],
})
export class AdminModule {}