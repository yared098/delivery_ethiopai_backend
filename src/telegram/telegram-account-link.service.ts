import {
  ConflictException,
  GoneException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramApiService } from './telegram-api.service';

@Injectable()
export class TelegramAccountLinkService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramApiService,
  ) {
    this.redis = new Redis(config.get<string>('REDIS_URL')!);
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  async getStatus(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { telegramId: true, telegramOtpEnabled: true },
    });
    if (!customer) throw new GoneException('Customer account not found');
    return {
      connected: Boolean(customer.telegramId),
      otpDeliveryEnabled: customer.telegramOtpEnabled,
    };
  }

  async getCourierStatus(courierId: string) {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
      select: { telegramId: true, telegramOtpEnabled: true },
    });
    if (!courier) throw new GoneException('Courier account not found');
    return {
      connected: Boolean(courier.telegramId),
      otpDeliveryEnabled: courier.telegramOtpEnabled,
    };
  }

  async createLink(customerId: string) {
    return this.createAccountLink(
      'telegram:account-link',
      customerId,
      await this.getStatus(customerId),
    );
  }

  async createCourierLink(courierId: string) {
    return this.createAccountLink(
      'telegram:courier-account-link',
      courierId,
      await this.getCourierStatus(courierId),
    );
  }

  private async createAccountLink(
    keyPrefix: string,
    accountId: string,
    status: { connected: boolean; otpDeliveryEnabled: boolean },
  ) {
    if (!this.telegram.isConfigured) {
      throw new ServiceUnavailableException('Telegram bot is not configured');
    }

    const bot = await this.telegram.getMe();
    if (!bot?.username) {
      throw new ServiceUnavailableException('Could not reach the Telegram bot');
    }

    const ttlSeconds = Number(this.config.get('TELEGRAM_LINK_TTL_SECONDS') || 600);
    const token = randomBytes(24).toString('base64url');
    await this.redis.setex(
      `${keyPrefix}:${token}`,
      ttlSeconds,
      accountId,
    );

    return {
      ...status,
      linkUrl: `https://t.me/${bot.username}?start=link_${token}`,
      expiresInSeconds: ttlSeconds,
    };
  }

  async completeLink(token: string, chatId: string) {
    if (!/^[A-Za-z0-9_-]{32}$/.test(token)) {
      throw new GoneException('This Telegram link is invalid or expired');
    }

    const claimed = (await this.redis.eval(
      "for i = 1, #KEYS do local value = redis.call('GET', KEYS[i]); if value then redis.call('DEL', KEYS[i]); return {tostring(i), value}; end; end; return nil",
      2,
      `telegram:account-link:${token}`,
      `telegram:courier-account-link:${token}`,
    )) as [string, string] | null;

    if (!claimed) {
      throw new GoneException('This Telegram link is invalid or expired');
    }

    const [keyIndex, accountId] = claimed;
    if (keyIndex === '1') {
      const [customer, linkedCustomer, linkedCourier] = await Promise.all([
        this.prisma.customer.findUnique({
          where: { id: accountId },
          select: { id: true, name: true, telegramId: true },
        }),
        this.prisma.customer.findUnique({
          where: { telegramId: chatId },
          select: { id: true },
        }),
        this.prisma.courier.findUnique({
          where: { telegramId: chatId },
          select: { id: true },
        }),
      ]);

      if (!customer) throw new GoneException('Customer account not found');
      if (
        (linkedCustomer && linkedCustomer.id !== accountId) ||
        linkedCourier
      ) {
        throw new ConflictException('This Telegram account is linked elsewhere');
      }
      if (customer.telegramId && customer.telegramId !== chatId) {
        throw new ConflictException(
          'Customer already linked to another Telegram account',
        );
      }

      await this.prisma.customer.update({
        where: { id: accountId },
        data: { telegramId: chatId, telegramOtpEnabled: true },
      });
      return { accountType: 'customer' as const, name: customer.name };
    }

    const [courier, linkedCustomer, linkedCourier] = await Promise.all([
      this.prisma.courier.findUnique({
        where: { id: accountId },
        select: { id: true, name: true, telegramId: true },
      }),
      this.prisma.customer.findUnique({
        where: { telegramId: chatId },
        select: { id: true },
      }),
      this.prisma.courier.findUnique({
        where: { telegramId: chatId },
        select: { id: true },
      }),
    ]);

    if (!courier) throw new GoneException('Courier account not found');
    if (
      linkedCustomer ||
      (linkedCourier && linkedCourier.id !== accountId)
    ) {
      throw new ConflictException('This Telegram account is linked elsewhere');
    }
    if (courier.telegramId && courier.telegramId !== chatId) {
      throw new ConflictException(
        'Courier already linked to another Telegram account',
      );
    }

    await this.prisma.courier.update({
      where: { id: accountId },
      data: { telegramId: chatId, telegramOtpEnabled: true },
    });
    return { accountType: 'courier' as const, name: courier.name };
  }

  async unlink(customerId: string) {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { telegramId: null, telegramOtpEnabled: false },
    });
    return { connected: false };
  }

  async unlinkCourier(courierId: string) {
    await this.prisma.courier.update({
      where: { id: courierId },
      data: { telegramId: null, telegramOtpEnabled: false },
    });
    return { connected: false };
  }
}