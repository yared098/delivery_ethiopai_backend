import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AccountType,
  NotificationType,
  StaffRole,
} from '@prisma/client';
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
import { StaffRoles } from '../common/decorators/staff-roles.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  // ══════════════════════════════════════════════════
  // 🔑 DEVICE TOKEN REGISTRATION
  // ══════════════════════════════════════════════════

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
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

  // ══════════════════════════════════════════════════
  // 🛡️ STAFF-ONLY: admin list + stats
  // ══════════════════════════════════════════════════

  /**
   * GET /api/v1/notifications/admin/list
   * List ALL notifications with filters + pagination.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  @Get('admin/list')
  async adminList(
    @Query('accountType') accountType?: AccountType,
    @Query('type') type?: NotificationType,
    @Query('unread') unread?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const where: any = {};
    if (accountType) where.accountType = accountType;
    if (type) where.type = type;
    if (unread === 'true') where.isRead = false;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const p = Math.max(1, Number(page));
    const l = Math.min(100, Math.max(1, Number(limit)));
    const skip = (p - 1) * l;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          courier: { select: { id: true, name: true, phone: true } },
          staff: { select: { id: true, name: true, phone: true } },
          order: {
            select: { id: true, trackingNumber: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      total,
      page: p,
      limit: l,
      pages: Math.ceil(total / l),
    };
  }

  /**
   * GET /api/v1/notifications/admin/stats
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN)
  @Get('admin/stats')
  async adminStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, unread, pushed, failed, todayCount] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { isRead: false } }),
      this.prisma.notification.count({ where: { pushSent: true } }),
      this.prisma.notification.count({
        where: { pushError: { not: null } },
      }),
      this.prisma.notification.count({
        where: { createdAt: { gte: startOfToday } },
      }),
    ]);

    return { total, unread, pushed, failed, today: todayCount };
  }

  // ══════════════════════════════════════════════════
  // 🔔 USER-FACING INBOX (for apps)
  // ══════════════════════════════════════════════════

  /**
   * GET /api/v1/notifications
   * List current account's notifications.
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async listMine(
    @Req() req: any,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
  ) {
    const { id, type } = req.user;
    const where: any = { accountType: type };
    if (type === 'CUSTOMER') where.customerId = id;
    if (type === 'COURIER') where.courierId = id;
    if (type === 'STAFF') where.staffId = id;
    if (unread === 'true') where.isRead = false;

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 20, 100),
    });
  }

  /**
   * GET /api/v1/notifications/unread-count
   */
  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const { id, type } = req.user;
    const where: any = { accountType: type, isRead: false };
    if (type === 'CUSTOMER') where.customerId = id;
    if (type === 'COURIER') where.courierId = id;
    if (type === 'STAFF') where.staffId = id;

    const count = await this.prisma.notification.count({ where });
    return { count };
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    const { id: accountId, type } = req.user;
    const where: any = { id, accountType: type };
    if (type === 'CUSTOMER') where.customerId = accountId;
    if (type === 'COURIER') where.courierId = accountId;
    if (type === 'STAFF') where.staffId = accountId;

    return this.prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * PATCH /api/v1/notifications/read-all
   */
  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  async markAllRead(@Req() req: any) {
    const { id, type } = req.user;
    const where: any = { accountType: type, isRead: false };
    if (type === 'CUSTOMER') where.customerId = id;
    if (type === 'COURIER') where.courierId = id;
    if (type === 'STAFF') where.staffId = id;

    return this.prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }
}