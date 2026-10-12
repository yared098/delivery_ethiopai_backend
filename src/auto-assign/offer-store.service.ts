import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class OfferStoreService {
  private readonly logger = new Logger(OfferStoreService.name);
  private redis: Redis;
  private readonly TTL_SECONDS = 30 * 60; // 30 min

  constructor(config: ConfigService) {
    this.redis = new Redis(config.get<string>('REDIS_URL')!);
  }

  async saveOfferedCouriers(orderId: string, courierIds: string[]) {
    const key = `offered:${orderId}`;
    if (courierIds.length === 0) return;
    await this.redis.sadd(key, ...courierIds);
    await this.redis.expire(key, this.TTL_SECONDS);
  }

  async getOfferedCouriers(orderId: string): Promise<string[]> {
    return this.redis.smembers(`offered:${orderId}`);
  }

  async wasCourierOffered(orderId: string, courierId: string): Promise<boolean> {
    return (await this.redis.sismember(`offered:${orderId}`, courierId)) === 1;
  }

  async clearOffers(orderId: string) {
    await this.redis.del(`offered:${orderId}`);
  }

  async incrementAttempt(orderId: string): Promise<number> {
    const key = `attempts:${orderId}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, this.TTL_SECONDS);
    return count;
  }

  async getAttempts(orderId: string): Promise<number> {
    const val = await this.redis.get(`attempts:${orderId}`);
    return val ? parseInt(val, 10) : 0;
  }

  async clearAttempts(orderId: string) {
    await this.redis.del(`attempts:${orderId}`);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}