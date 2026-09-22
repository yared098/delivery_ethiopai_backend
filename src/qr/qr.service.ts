import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  // ══════════════════════════════════════════════════
  // HMAC SIGNATURE
  // ══════════════════════════════════════════════════

  /**
   * Sign a value with HMAC-SHA256.
   * Returns 6-char hex signature (short, safe for URLs).
   */
  signQr(value: string): string {
    const secret = this.config.get<string>('QR_SECRET');
    if (!secret) throw new Error('QR_SECRET not configured');

    return createHmac('sha256', secret).update(value).digest('hex').slice(0, 6);
  }

  signTracking(value: string): string {
    const secret = this.config.get<string>('TRACKING_SECRET');
    if (!secret) throw new Error('TRACKING_SECRET not configured');

    return createHmac('sha256', secret).update(value).digest('hex').slice(0, 6);
  }

  /**
   * Constant-time signature verification.
   */
  verifySignature(value: string, signature: string, type: 'qr' | 'tracking'): boolean {
    const expected =
      type === 'qr' ? this.signQr(value) : this.signTracking(value);

    if (expected.length !== signature.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  }

  // ══════════════════════════════════════════════════
  // QR GENERATION
  // ══════════════════════════════════════════════════

  /**
   * Generate QR code + signature for an order.
   * Saves QR payload, signature, and PNG data URL to the order.
   */
  async generateForOrder(orderId: string, trackingNumber: string) {
    const publicWebUrl =
      this.config.get<string>('PUBLIC_WEB_URL') || 'http://localhost:5173';

    const signature = this.signQr(trackingNumber);
    const payload = `${publicWebUrl}/q/${trackingNumber}?s=${signature}`;

    // Generate QR as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Save to order
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        qrCodePayload: payload,
        qrCodeSignature: signature,
        qrCodeImageUrl: qrDataUrl,
      },
    });

    this.logger.log(`QR generated for ${trackingNumber}`);
    return { payload, signature, imageUrl: qrDataUrl };
  }

  // ══════════════════════════════════════════════════
  // TRACKING TOKEN
  // ══════════════════════════════════════════════════

  /**
   * Generate a 32-hex public tracking token + signature.
   * Returns the full tracking URL.
   */
  async generateTrackingToken(orderId: string): Promise<{
    token: string;
    signature: string;
    url: string;
  }> {
    const publicWebUrl =
      this.config.get<string>('PUBLIC_WEB_URL') || 'http://localhost:5173';

    const token = randomBytes(16).toString('hex');
    const signature = this.signTracking(token);
    const url = `${publicWebUrl}/t/${token}?s=${signature}`;

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        trackingToken: token,
        trackingTokenSetAt: new Date(),
        trackingTokenExpiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
        ),
        trackingTokenRevokedAt: null,
        trackingUrl: url,
      },
    });

    this.logger.log(`Tracking link generated for order ${orderId}`);
    return { token, signature, url };
  }

  /**
   * Revoke a tracking token (immediate).
   */
  async revokeTrackingToken(orderId: string) {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { trackingTokenRevokedAt: new Date() },
    });
    return { message: 'Tracking link revoked' };
  }

  // ══════════════════════════════════════════════════
  // PUBLIC QR SCAN
  // ══════════════════════════════════════════════════

  /**
   * Public-safe info for a scanned QR code.
   * Verifies HMAC signature before returning any data.
   */
  async getPublicInfo(trackingNumber: string, signature: string) {
    if (!this.verifySignature(trackingNumber, signature, 'qr')) {
      throw new BadRequestException('Invalid QR signature');
    }

    const order = await this.prisma.order.findUnique({
      where: { trackingNumber },
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        senderName: true,
        receiverName: true,
        receiverPhone: true,
        totalWeightKg: true,
        isFragile: true,
        isRefrigerated: true,
        originBranch: { select: { name: true, code: true } },
        destBranch: { select: { name: true, code: true } },
        items: {
          select: {
            description: true,
            quantity: true,
            weightKg: true,
            isFragile: true,
          },
        },
      },
    });

    if (!order) throw new BadRequestException('Order not found');

    return {
      trackingNumber: order.trackingNumber,
      status: order.status,
      origin: order.originBranch
        ? { branch: order.originBranch.name, code: order.originBranch.code }
        : null,
      destination: order.destBranch
        ? { branch: order.destBranch.name, code: order.destBranch.code }
        : null,
      receiver: {
        name: this.maskName(order.receiverName),
        phoneMasked: this.maskPhone(order.receiverPhone),
      },
      package: {
        weightKg: order.totalWeightKg,
        isFragile: order.isFragile,
        isRefrigerated: order.isRefrigerated,
        itemCount: order.items.length,
      },
      items: order.items.map((it) => ({
        description: it.description,
        quantity: it.quantity,
        weightKg: it.weightKg,
        isFragile: it.isFragile,
      })),
      signature: signature,
      checkedAt: new Date().toISOString(),
    };
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  private maskName(name: string | null): string {
    if (!name) return 'Unknown';
    const parts = name.trim().split(/\s+/);
    return parts.map((p, i) => (i === 0 ? p : p[0] + '.')).join(' ');
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 8) return '****';
    return phone.slice(0, 5) + '****' + phone.slice(-4);
  }
}
