import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { CourierJwtGuard } from '../common/guards/courier-jwt.guard';
import { CurrentCourier } from '../common/decorators/current-courier.decorator';
import { AutoAssignService } from './auto-assign.service';

class RejectDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('auto-assign')
export class AutoAssignController {
  constructor(private readonly service: AutoAssignService) {}

  @Post(':orderId/accept')
  @UseGuards(CourierJwtGuard)
  accept(
    @Param('orderId') orderId: string,
    @CurrentCourier('id') courierId: string,
  ) {
    return this.service.acceptOffer(orderId, courierId);
  }

  @Post(':orderId/reject')
  @UseGuards(CourierJwtGuard)
  reject(
    @Param('orderId') orderId: string,
    @CurrentCourier('id') courierId: string,
    @Body() body: RejectDto,
  ) {
    return this.service.rejectOffer(orderId, courierId, body.reason);
  }
}