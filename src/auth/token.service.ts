import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

export interface AccessPayload {
  sub: string;
  role: string;
  regionId?: string;
  branchId?: string;
}

interface Meta {
  userAgent?: string;
  ipAddress?: string;
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async issueTokens(payload: AccessPayload, meta: Meta) {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES'),
    });

    const family = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: payload.sub, family },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES'),
      },
    );

    const tokenHash = await argon2.hash(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash,
        family,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  async rotate(refreshToken: string, meta: Meta) {
    let decoded: any;
    try {
      decoded = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const familyTokens = await this.prisma.refreshToken.findMany({
      where: { family: decoded.family },
      orderBy: { createdAt: 'desc' },
    });

    if (!familyTokens.length) {
      throw new UnauthorizedException('Token family not found');
    }

    let matched: (typeof familyTokens)[number] | null = null;
    for (const t of familyTokens) {
      if (await argon2.verify(t.tokenHash, refreshToken)) {
        matched = t;
        break;
      }
    }

    if (!matched || matched.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { family: decoded.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Refresh token reuse detected — session revoked',
      );
    }

    if (matched.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: matched.userId },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User inactive');
    }

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        role: user.role,
        regionId: user.regionId ?? undefined,
        branchId: user.branchId ?? undefined,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES'),
      },
    );

    const newRefreshToken = await this.jwt.signAsync(
      { sub: user.id, family: decoded.family },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES'),
      },
    );

    const newHash = await argon2.hash(newRefreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        family: decoded.family,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByRefreshToken(refreshToken: string) {
    try {
      const decoded: any = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      await this.prisma.refreshToken.updateMany({
        where: { family: decoded.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // silent
    }
  }
}
