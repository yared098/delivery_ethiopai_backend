import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  GoneException,
  BadRequestException,
} from '@nestjs/common';
import {
  IsString,
  IsNumber,
  IsOptional,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AfroMessageService } from '../integrations/afromessage/afromessage.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { Public } from '../common/decorators/public.decorator';
import { AccountType, OrderStatus } from '@prisma/client';

class CompleteDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsString()
  address?: string;
}

class VerifyOtpDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}

@Public()
@Controller('r')
export class ReceiverLinkController {
  constructor(
    private prisma: PrismaService,
    private sms: AfroMessageService,
    private trackingWs: TrackingGateway,
  ) {}

  @Get(':shortCode')
  async getLink(@Param('shortCode') shortCode: string) {
    const link = await this.prisma.receiverLink.findUnique({
      where: { shortCode },
      include: { order: { include: { items: true } } },
    });

    if (!link) throw new NotFoundException('Link not found');
    if (link.status === 'REVOKED') return { mode: 'revoked' };
    if (link.status === 'EXPIRED' || link.expiresAt < new Date()) {
      return { mode: 'expired' };
    }

    if (link.status === 'USED') {
      return {
        mode: 'tracking',
        order: this.publicOrder(link.order),
        link: {
          shortCode: link.shortCode,
          status: link.status,
          expiresAt: link.expiresAt,
        },
      };
    }

    return {
      mode: 'onboarding',
      order: this.publicOrder(link.order),
      link: {
        shortCode: link.shortCode,
        status: link.status,
        expiresAt: link.expiresAt,
      },
    };
  }

  @Post(':shortCode/otp/request')
  async requestOtp(@Param('shortCode') shortCode: string) {
    const link = await this.prisma.receiverLink.findUnique({
      where: { shortCode },
    });
    if (!link) throw new NotFoundException('Link not found');
    if (link.status !== 'ACTIVE' || link.expiresAt < new Date()) {
      throw new GoneException('Link is no longer active');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await argon2.hash(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const normalizedPhone = normalizePhone(link.receiverPhone);

    console.log('[otp/request] shortCode:', shortCode);
    console.log('[otp/request] raw phone:', link.receiverPhone);
    console.log('[otp/request] normalized phone:', normalizedPhone);

    // Invalidate prior unused codes so only newest is valid
    await this.prisma.otpCode.updateMany({
      where: {
        phone: normalizedPhone,
        purpose: 'receiver_link',
        used: false,
      },
      data: { used: true },
    });

    const created = await this.prisma.otpCode.create({
      data: {
        phone: normalizedPhone,
        codeHash,
        purpose: 'receiver_link',
        expiresAt,
        accountType: AccountType.CUSTOMER,
      },
    });

    console.log('[otp/request] created row id:', created.id);

    await this.sms.sendOtp(normalizedPhone, code);

    return {
      phone: normalizedPhone,
      expiresInSec: 300,
    };
  }

  @Post(':shortCode/otp/verify')
  async verifyOtp(
    @Param('shortCode') shortCode: string,
    @Body() body: VerifyOtpDto,
  ) {
    const link = await this.prisma.receiverLink.findUnique({
      where: { shortCode },
    });
    if (!link) throw new NotFoundException('Link not found');

    const normalizedPhone = normalizePhone(link.receiverPhone);

    console.log('[verify] shortCode:', shortCode);
    console.log('[verify] raw phone:', link.receiverPhone);
    console.log('[verify] normalized phone:', normalizedPhone);
    console.log('[verify] body:', body, 'code type:', typeof body?.code);

    const records = await this.prisma.otpCode.findMany({
      where: {
        phone: normalizedPhone,
        purpose: 'receiver_link',
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log('[verify] found', records.length, 'candidate codes');
    records.forEach((r) =>
      console.log(
        '  → id:', r.id,
        'phone:', r.phone,
        'attempts:', r.attempts,
        'expires:', r.expiresAt,
      ),
    );

    if (!records.length) {
      throw new BadRequestException('Code expired or not found');
    }

    const submitted = String(body?.code ?? '').trim();
    if (!/^\d{6}$/.test(submitted)) {
      throw new BadRequestException('Code must be 6 digits');
    }

    let matched: (typeof records)[number] | null = null;
    for (const rec of records) {
      if (rec.attempts >= 3) continue;
      const ok = await argon2.verify(rec.codeHash, submitted).catch(() => false);
      if (ok) {
        matched = rec;
        break;
      }
    }

    if (!matched) {
      await this.prisma.otpCode.update({
        where: { id: records[0].id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid code');
    }

    await this.prisma.otpCode.updateMany({
      where: {
        phone: normalizedPhone,
        purpose: 'receiver_link',
        used: false,
      },
      data: { used: true },
    });

    return { verified: true };
  }

  @Post(':shortCode/complete')
  async complete(
    @Param('shortCode') shortCode: string,
    @Body() dto: CompleteDto,
  ) {
    const link = await this.prisma.receiverLink.findUnique({
      where: { shortCode },
    });
    if (!link) throw new NotFoundException('Link not found');
    if (link.status !== 'ACTIVE') {
      throw new GoneException('Link is no longer active');
    }

    if (
      dto.lat < 3.4 || dto.lat > 14.9 ||
      dto.lng < 32.9 || dto.lng > 48.0
    ) {
      throw new BadRequestException('Coordinates outside Ethiopia');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: link.orderId },
        data: {
          receiverLat: dto.lat,
          receiverLng: dto.lng,
          receiverLocationSource: 'link',
          status: OrderStatus.PENDING_PAYMENT,
        },
      });

      await tx.receiverLink.update({
        where: { id: link.id },
        data: { status: 'USED', filledAt: new Date() },
      });

      await tx.orderEvent.create({
        data: {
          orderId: link.orderId,
          status: OrderStatus.PENDING_PAYMENT,
          note: 'Receiver shared location via link',
          actorType: null,
          actorId: null,
          actorName: 'System',
          isPublic: true,
        },
      });

      return order;
    });

    this.trackingWs.broadcastStatusChange(link.orderId, {
      status: OrderStatus.PENDING_PAYMENT,
      note: 'Receiver shared location',
      timestamp: new Date().toISOString(),
    });

    return {
      order: this.publicOrder(updated),
      trackingToken: updated.trackingToken,
    };
  }

  // private publicOrder(order: any) {
  //   return {
  //     id: order.id,
  //     trackingNumber: order.trackingNumber,
  //     trackingToken: order.trackingToken,
  //     status: order.status,
  //     senderName: maskName(order.senderName),
  //     receiverName: order.receiverName ? maskName(order.receiverName) : undefined,
  //     receiverPhone: maskPhone(order.receiverPhone),
  //     itemCount: order.items?.length ?? 1,
  //     totalWeightKg: order.totalWeightKg,
  //     createdAt: order.createdAt,
  //   };
  // }
    // ══════════════════════════════════════════════════
  // Helper — never leak private fields
  // ══════════════════════════════════════════════════
  private publicOrder(order: any) {
    return {
      id: order.id,
      trackingNumber: order.trackingNumber,
      trackingToken: order.trackingToken,
      status: order.status,
      senderName: maskName(order.senderName),
      receiverName: order.receiverName ? maskName(order.receiverName) : undefined,
      receiverPhone: maskPhone(order.receiverPhone),
      itemCount: order.items?.length ?? 1,
      totalWeightKg: order.totalWeightKg,
      packageDescription: order.packageDescription ?? null,
      createdAt: order.createdAt,

      // 🆕 Safe item list for the public receiver page
      items: Array.isArray(order.items)
        ? order.items.map((it: any) => ({
            id: it.id,
            description: it.description ?? null,
            type: it.type ?? null,
            quantity: it.quantity ?? 1,
            weightKg: it.weightKg ?? 0,
            isFragile: !!it.isFragile,
            isRefrigerated: !!it.isRefrigerated,
          }))
        : [],
    };
  }
}

function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
  if (digits.length === 9) return '251' + digits;
  return '251' + digits;
}

function maskName(name: string): string {
  if (!name) return '';
  const [first, last] = name.split(' ');
  return last ? `${first} ${last[0]}.` : first;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}
