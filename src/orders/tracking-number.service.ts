import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TrackingNumberService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generates a unique tracking number:
   *   ETH-2026-ABC123
   */
  async generate(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ETH-${year}-`;

    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.randomCode(6);
      const candidate = prefix + code;

      const existing = await this.prisma.order.findUnique({
        where: { trackingNumber: candidate },
      });

      if (!existing) return candidate;
    }

    throw new Error('Failed to generate unique tracking number');
  }

  /**
   * Generates a tracking token (for public tracking URL).
   */
  generateTrackingToken(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Generates short code for receiver link.
   */
  generateShortCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private randomCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }
}
