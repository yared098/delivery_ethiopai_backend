import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UnregisterDeviceTokenDto } from './dto/unregister-device-token.dto';
import {
  SendNotificationDto,
  BroadcastNotificationDto,
} from './dto/send-notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';   // ← FIXED

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  // ══════════════════════════════════════════════════
  // 🔑 DEVICE TOKEN REGISTRATION (any logged-in account)
  // ══════════════════════════════════════════════════

  /**
   * POST /api/v1/notifications/register-token
   * Body: { token, platform, accountType }
   * Auth: Bearer JWT (any account type)
   */
  @UseGuards(JwtAuthGuard)
  @Post('register-token')
  @HttpCode(200)
  async registerToken(@Body() dto: RegisterDeviceTokenDto, @Req() req: any) {
    const { id, type } = req.user;

    const data: any = {
      token: dto.token,
      platform: dto.platform,
      accountType: dto.accountType,
      isActive: true,
      lastUsedAt: new Date(),
      // reset all account FKs first (device may switch accounts)
      customerId: null,
      courierId: null,
      staffId: null,
    };
    if (dto.accountType === 'CUSTOMER') data.customerId = id;
    if (dto.accountType === 'COURIER') data.courierId = id;
    if (dto.accountType === 'STAFF') data.staffId = id;

    const saved = await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      update: data,
      create: data,
    });

    return { ok: true, id: saved.id, platform: saved.platform };
  }

  /**
   * POST /api/v1/notifications/unregister-token
   * Body: { token }
   * Auth: Bearer JWT
   */
  @UseGuards(JwtAuthGuard)
  @Post('unregister-token')
  @HttpCode(200)
  async unregisterToken(@Body() dto: UnregisterDeviceTokenDto) {
    await this.prisma.deviceToken.updateMany({
      where: { token: dto.token },
      data: { isActive: false },
    });
    return { ok: true };
  }

  /**
   * POST /api/v1/notifications/test
   * Send a test push to the caller's own devices.
   * Auth: Bearer JWT
   */
  @UseGuards(JwtAuthGuard)
  @Post('test')
  @HttpCode(200)
  async test(@Req() req: any) {
    const { id, type } = req.user;
    return this.notifications.sendToAccount(type, id, {
      title: 'Test Notification 🔔',
      body: 'If you see this, FCM is working perfectly.',
      data: { type: 'TEST' },
    });
  }

  // ══════════════════════════════════════════════════
  // 🛡️ STAFF-ONLY: manual send & broadcast
  // ══════════════════════════════════════════════════

  /**
   * POST /api/v1/notifications/send
   * Staff-only. Send a manual push to one account.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)   // ← FIXED
  @Post('send')
  @HttpCode(200)
  async sendManual(@Body() dto: SendNotificationDto) {
    return this.notifications.sendToAccount(dto.accountType, dto.accountId, {
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl,
      data: dto.data,
    });
  }

  /**
   * POST /api/v1/notifications/broadcast
   * Staff-only. Broadcast to an FCM topic.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)   // ← FIXED
  @Post('broadcast')
  @HttpCode(200)
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    if (!dto.topic) {
      return { success: false, error: 'Topic is required for broadcast' };
    }
    return this.notifications.sendToTopic(dto.topic, {
      title: dto.title,
      body: dto.body,
    });
  }
}