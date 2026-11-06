import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CourierAppService } from './courier-app.service';
import { CourierJwtGuard } from '../common/guards/courier-jwt.guard';
import { CurrentCourier } from '../common/decorators/current-courier.decorator';
import { UpdateCourierProfileDto } from './dto/update-courier-profile.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import { ToggleOnlineDto } from './dto/toggle-online.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { ScanDeliverDto } from './dto/scan-deliver.dto';
import { EarningStatus } from '@prisma/client';

@Controller('courier')
@UseGuards(CourierJwtGuard)
export class CourierAppController {
  constructor(private courier: CourierAppService) {}

  // ══════════════════════════════════════════════════
  // PROFILE
  // ══════════════════════════════════════════════════

  @Get('me')
  getMe(@CurrentCourier() c: any) {
    return this.courier.getMe(c.id);
  }

  @Patch('me')
  updateMe(
    @CurrentCourier() c: any,
    @Body() dto: UpdateCourierProfileDto,
  ) {
    return this.courier.updateMe(c.id, dto);
  }

  // ══════════════════════════════════════════════════
  // ONLINE / OFFLINE
  // ══════════════════════════════════════════════════

  @Post('me/online')
  @HttpCode(HttpStatus.OK)
  goOnline(@CurrentCourier() c: any, @Body() dto: ToggleOnlineDto) {
    return this.courier.goOnline(c.id, dto.lat, dto.lng);
  }

  @Post('me/offline')
  @HttpCode(HttpStatus.OK)
  goOffline(@CurrentCourier() c: any) {
    return this.courier.goOffline(c.id);
  }

  @Post('me/location')
  @HttpCode(HttpStatus.OK)
  updateLocation(
    @CurrentCourier() c: any,
    @Body() dto: UpdateCourierLocationDto,
  ) {
    return this.courier.updateLocation(c.id, dto);
  }

  // ══════════════════════════════════════════════════
  // QR CODE SCAN & AUTO ASSIGN / REASSIGN
  // ══════════════════════════════════════════════════

  /**
   * Scan QR code to view and auto-assign / reassign order to the scanning courier.
   * If order is unassigned, or assigned to another courier, system reassigns to this courier.
   */
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  scanQr(@CurrentCourier() c: any, @Body() dto: ScanQrDto) {
    return this.courier.scanOrder(c.id, dto);
  }

  @Post('orders/scan')
  @HttpCode(HttpStatus.OK)
  scanOrderQr(@CurrentCourier() c: any, @Body() dto: ScanQrDto) {
    return this.courier.scanOrder(c.id, dto);
  }

  @Post('jobs/scan')
  @HttpCode(HttpStatus.OK)
  scanJobQr(@CurrentCourier() c: any, @Body() dto: ScanQrDto) {
    return this.courier.scanOrder(c.id, dto);
  }

  /**
   * Scan QR at pickup. Reassigns if not assigned to this courier, and transitions status to PICKED_UP.
   */
  @Post('orders/scan-pickup')
  @HttpCode(HttpStatus.OK)
  scanPickupGeneral(@CurrentCourier() c: any, @Body() dto: ScanQrDto) {
    return this.courier.scanOrder(c.id, { ...dto, action: 'pickup' });
  }

  @Post('jobs/scan-pickup')
  @HttpCode(HttpStatus.OK)
  scanJobPickupGeneral(@CurrentCourier() c: any, @Body() dto: ScanQrDto) {
    return this.courier.scanOrder(c.id, { ...dto, action: 'pickup' });
  }

  @Post('orders/:id/scan-pickup')
  @HttpCode(HttpStatus.OK)
  scanPickupById(
    @CurrentCourier() c: any,
    @Param('id') id: string,
    @Body() dto: ScanQrDto,
  ) {
    return this.courier.scanOrder(c.id, { ...dto, action: 'pickup' }, id);
  }

  @Post('jobs/:id/scan-pickup')
  @HttpCode(HttpStatus.OK)
  scanJobPickupById(
    @CurrentCourier() c: any,
    @Param('id') id: string,
    @Body() dto: ScanQrDto,
  ) {
    return this.courier.scanOrder(c.id, { ...dto, action: 'pickup' }, id);
  }

  /**
   * Scan QR at delivery. Marks status as DELIVERED and releases earnings.
   */
  @Post('orders/:id/scan-deliver')
  @HttpCode(HttpStatus.OK)
  scanDeliverById(
    @CurrentCourier() c: any,
    @Param('id') id: string,
    @Body() dto: ScanDeliverDto,
  ) {
    return this.courier.scanDeliver(c.id, id, dto);
  }

  @Post('jobs/:id/scan-deliver')
  @HttpCode(HttpStatus.OK)
  scanJobDeliverById(
    @CurrentCourier() c: any,
    @Param('id') id: string,
    @Body() dto: ScanDeliverDto,
  ) {
    return this.courier.scanDeliver(c.id, id, dto);
  }

  // ══════════════════════════════════════════════════
  // JOBS
  // ══════════════════════════════════════════════════

  @Get('jobs')
  listJobs(
    @CurrentCourier() c: any,
    @Query('status') status: 'active' | 'completed' | 'all' = 'active',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.courier.listJobs(
      c.id,
      status,
      Number(page),
      Number(limit),
    );
  }

  @Get('jobs/stats')
  getStats(@CurrentCourier() c: any) {
    return this.courier.getStats(c.id);
  }

  @Get('jobs/:id')
  getJob(@CurrentCourier() c: any, @Param('id') id: string) {
    return this.courier.getJob(c.id, id);
  }

  // ══════════════════════════════════════════════════
  // EARNINGS
  // ══════════════════════════════════════════════════

  @Get('earnings')
  listEarnings(
    @CurrentCourier() c: any,
    @Query('status') status?: EarningStatus,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.courier.listEarnings(
      c.id,
      status,
      Number(page),
      Number(limit),
    );
  }

  @Get('earnings/summary')
  getEarningsSummary(@CurrentCourier() c: any) {
    return this.courier.getEarningsSummary(c.id);
  }
}
