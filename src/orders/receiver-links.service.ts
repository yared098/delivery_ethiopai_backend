import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingNumberService } from './tracking-number.service';
import { AfroMessageService } from '../integrations/afromessage/afromessage.service';
import { ReceiverLinkStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

const LINK_TTL_HOURS = 48;
const PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL || 'http://localhost:5173';

@Injectable()
export class ReceiverLinksService {
  constructor(
    private prisma: PrismaService,
    private tracking: TrackingNumberService,
    private sms: AfroMessageService,
  ) {}

  /**
   * Create a secure receiver link for an order.
   */
  async createForOrder(
    orderId: string,
    receiverPhone: string,
    createdById?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    // Revoke any existing active links for this order
    await this.prisma.receiverLink.updateMany({
      where: { orderId, status: ReceiverLinkStatus.ACTIVE },
      data: { status: ReceiverLinkStatus.REVOKED },
    });

    const shortCode = this.tracking.generateShortCode();
    const rawToken = randomUUID() + '-' + randomUUID();
    const tokenHash = await argon2.hash(rawToken);

    const expiresAt = new Date(Date.now() + LINK_TTL_HOURS * 60 * 60 * 1000);

    const link = await this.prisma.receiverLink.create({
      data: {
        orderId,
        shortCode,
        tokenHash,
        receiverPhone,
        expiresAt,
        createdById,
        status: ReceiverLinkStatus.ACTIVE,
      },
    });

    return {
      id: link.id,
      shortCode,
      url: `${PUBLIC_WEB_URL}/receiver/${shortCode}`,
      expiresAt,
    };
  }

  /**
   * Look up a link by short code (public).
   */
  async findByShortCode(shortCode: string) {
    const link = await this.prisma.receiverLink.findUnique({
      where: { shortCode },
      include: {
        order: {
          select: {
            id: true,
            trackingNumber: true,
            senderName: true,
            receiverName: true,
            receiverPhone: true,
            totalWeightKg: true,
            packageDescription: true,
            status: true,
          },
        },
      },
    });

    if (!link) throw new NotFoundException('Link not found');

    // Check expiry
    if (link.expiresAt < new Date() && link.status === ReceiverLinkStatus.ACTIVE) {
      await this.prisma.receiverLink.update({
        where: { id: link.id },
        data: { status: ReceiverLinkStatus.EXPIRED },
      });
      throw new BadRequestException('Link has expired');
    }

    if (link.status !== ReceiverLinkStatus.ACTIVE) {
      throw new BadRequestException(`Link is ${link.status.toLowerCase()}`);
    }

    return link;
  }

  /**
   * Log that the receiver opened the link.
   */
  async markOpened(id: string, ip: string) {
    await this.prisma.receiverLink.update({
      where: { id },
      data: {
        openedAt: new Date(),
        openedIp: ip,
      },
    });
  }

  /**
   * Mark the link as used after successful verification.
   */
  async markUsed(id: string, ip: string) {
    await this.prisma.receiverLink.update({
      where: { id },
      data: {
        status: ReceiverLinkStatus.USED,
        filledAt: new Date(),
        filledIp: ip,
      },
    });
  }

  /**
   * Revoke a link.
   */
  async revoke(linkId: string) {
    await this.prisma.receiverLink.update({
      where: { id: linkId },
      data: { status: ReceiverLinkStatus.REVOKED },
    });
    return { message: 'Link revoked' };
  }
}
