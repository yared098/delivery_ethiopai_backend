import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AfroMessageService } from '../integrations/afromessage/afromessage.service';
import { ConfigService } from '@nestjs/config';
import { AccountType } from '@prisma/client';
import * as argon2 from 'argon2';
import { Redis } from 'ioredis';
import { TelegramApiService } from '../telegram/telegram-api.service';

@Injectable()
export class OtpService implements OnModuleDestroy {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private sms: AfroMessageService,
    private config: ConfigService,
    private telegram: TelegramApiService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL')!);
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }

  // ═════════════════════════════════════════════════════════════════════
  // GOOGLE PLAY STORE TEST NUMBERS (default OTP: 123456)
  // Only for review/testing — do not use in production without review
  // ══════════════════════════════════════════════════════════════════════
  private readonly TEST_PHONES: Record<string, string> = {
    '251988107722': '123456', // 0988107722
    '251956309313': '123456', // 0956309313
  };

  private isTestPhone(phone: string): boolean {
    return phone in this.TEST_PHONES;
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    if (digits.length === 9) return '251' + digits;
    throw new BadRequestException('Invalid Ethiopian phone number');
  }

  async requestOtp(
    rawPhone: string,
    accountType: AccountType,
    purpose = 'login',
    extraIds: { staffId?: string; courierId?: string } = {},
  ): Promise<'telegram' | 'sms'> {
    const phone = this.normalizePhone(rawPhone);

    const limit = Number(this.config.get('OTP_RATE_LIMIT_PER_10MIN') || 3);
    const key = `otp:rate:${phone}:${accountType}:${purpose}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 600);
    if (count > limit) {
      throw new HttpException(
        'Too many OTP requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // ── Test phone numbers: fixed OTP 123456, no SMS sent ──
    if (this.isTestPhone(phone)) {
      const testCode = this.TEST_PHONES[phone];
      const codeHash = await argon2.hash(testCode);
      const ttl = Number(this.config.get('OTP_TTL_SECONDS') || 300);
      const expiresAt = new Date(Date.now() + ttl * 1000);

      await this.prisma.otpCode.updateMany({
        where: { phone, accountType, purpose, used: false },
        data: { used: true },
      });

      await this.prisma.otpCode.create({
        data: {
          phone,
          accountType,
          codeHash,
          purpose,
          expiresAt,
          staffId: extraIds.staffId,
          courierId: extraIds.courierId,
        },
      });

      return 'sms';
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await argon2.hash(code);
    const ttl = Number(this.config.get('OTP_TTL_SECONDS') || 300);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await this.prisma.otpCode.updateMany({
      where: { phone, accountType, purpose, used: false },
      data: { used: true },
    });

    await this.prisma.otpCode.create({
      data: {
        phone,
        accountType,
        codeHash,
        purpose,
        expiresAt,
        staffId: extraIds.staffId,
        courierId: extraIds.courierId,
      },
    });

    if (accountType === AccountType.CUSTOMER) {
      const customer = await this.prisma.customer.findUnique({
        where: { phone },
        select: { telegramId: true, telegramOtpEnabled: true },
      });
      if (
        customer?.telegramId &&
        customer.telegramOtpEnabled &&
        this.telegram.isConfigured
      ) {
        const telegramMessage = await this.telegram.sendMessage(
          customer.telegramId,
          `Your Deliver Ethiopia verification code is ${code}. It expires in ${Math.ceil(ttl / 60)} minutes. Do not share this code.`,
        );
        if (telegramMessage !== null) return 'telegram';
      }
    } else if (accountType === AccountType.COURIER && extraIds.courierId) {
      const courier = await this.prisma.courier.findUnique({
        where: { id: extraIds.courierId },
        select: { telegramId: true, telegramOtpEnabled: true },
      });
      if (
        courier?.telegramId &&
        courier.telegramOtpEnabled &&
        this.telegram.isConfigured
      ) {
        const telegramMessage = await this.telegram.sendMessage(
          courier.telegramId,
          `Your Deliver Ethiopia verification code is ${code}. It expires in ${Math.ceil(ttl / 60)} minutes. Do not share this code.`,
        );
        if (telegramMessage !== null) return 'telegram';
      }
    }

    const sent = await this.sms.sendOtp(phone, code);
    if (!sent) throw new BadRequestException('Failed to send OTP');
    return 'sms';
  }

  async verifyOtp(
    rawPhone: string,
    code: string,
    accountType: AccountType,
    purpose = 'login',
  ): Promise<string> {
    const phone = this.normalizePhone(rawPhone);

    // ── Test phone numbers: accept 123456 directly ──
    if (this.isTestPhone(phone)) {
      if (code !== this.TEST_PHONES[phone]) {
        throw new BadRequestException('Invalid OTP');
      }
      await this.prisma.otpCode.updateMany({
        where: { phone, accountType, purpose, used: false },
        data: { used: true },
      });
      return phone;
    }

    const record = await this.prisma.otpCode.findFirst({
      where: { phone, accountType, purpose, used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException('No active OTP');
    if (record.expiresAt < new Date()) throw new BadRequestException('OTP expired');

    const maxAttempts = Number(this.config.get('OTP_MAX_ATTEMPTS') || 3);
    if (record.attempts >= maxAttempts) {
      throw new BadRequestException('Too many attempts. Request a new OTP.');
    }

    const valid = await argon2.verify(record.codeHash, code);
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    return phone;
  }
}
