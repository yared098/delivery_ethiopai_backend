import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  HttpException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { QrService } from './qr.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('public/qr')
export class QrController implements OnModuleDestroy {
  private redis: Redis;

  constructor(
    private qr: QrService,
    private config: ConfigService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL')!);
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  /**
   * PUBLIC — scan a QR code.
   * Rate limited to 30 requests per minute per IP.
   */
  @Public()
  @Get(':trackingNumber')
  @HttpCode(HttpStatus.OK)
  async scan(
    @Param('trackingNumber') trackingNumber: string,
    @Query('s') signature: string,
    @Req() req: any,
  ) {
    if (!signature) {
      throw new HttpException('Missing signature', HttpStatus.BAD_REQUEST);
    }

    // Rate limit by IP
    const key = `qr:rate:${req.ip}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);
    if (count > 30) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return this.qr.getPublicInfo(trackingNumber, signature);
  }
}
