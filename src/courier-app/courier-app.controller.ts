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