import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType, StaffRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

export interface AccessPayload {
  sub: string;
  accountType: AccountType;
  role?: StaffRole;
  regionId?: string | null;
  branchId?: string | null;
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
      { sub: payload.sub, accountType: payload.accountType, family },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES'),
      },
    );

    const tokenHash = await argon2.hash(refreshToken);

    const data: any = {
      accountId: payload.sub,
      accountType: payload.accountType,
      tokenHash,
      family,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    };

    if (payload.accountType === AccountType.STAFF) data.staffId = payload.sub;
    if (payload.accountType === AccountType.COURIER) data.courierId = payload.sub;
    if (payload.accountType === AccountType.CUSTOMER) data.customerId = payload.sub;

    await this.prisma.refreshToken.create({ data });

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
      throw new UnauthorizedException('Refresh token reuse detected — session revoked');
    }

    if (matched.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    let payload: AccessPayload | null = null;

    if (matched.accountType === AccountType.STAFF) {
      const account = await this.prisma.staff.findUnique({
        where: { id: matched.accountId },
      });
      if (account && account.isActive) {
        payload = {
          sub: account.id,
          accountType: AccountType.STAFF,
          role: account.role,
          regionId: account.regionId,
          branchId: account.branchId,
        };
      }
    } else if (matched.accountType === AccountType.COURIER) {
      const account = await this.prisma.courier.findUnique({
        where: { id: matched.accountId },
      });
      if (account && account.isActive) {
        payload = {
          sub: account.id,
          accountType: AccountType.COURIER,
          regionId: account.regionId,
          branchId: account.branchId,
        };
      }
    } else if (matched.accountType === AccountType.CUSTOMER) {
      const account = await this.prisma.customer.findUnique({
        where: { id: matched.accountId },
      });
      if (account && account.isActive) {
        payload = {
          sub: account.id,
          accountType: AccountType.CUSTOMER,
        };
      }
    }

    if (!payload) {
      throw new UnauthorizedException('Account inactive');
    }

    const newAccess = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES'),
    });

    const newRefresh = await this.jwt.signAsync(
      { sub: payload.sub, accountType: payload.accountType, family: decoded.family },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES'),
      },
    );

    const newHash = await argon2.hash(newRefresh);

    const newData: any = {
      accountId: payload.sub,
      accountType: payload.accountType,
      tokenHash: newHash,
      family: decoded.family,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    };
    if (payload.accountType === AccountType.STAFF) newData.staffId = payload.sub;
    if (payload.accountType === AccountType.COURIER) newData.courierId = payload.sub;
    if (payload.accountType === AccountType.CUSTOMER) newData.customerId = payload.sub;

    await this.prisma.refreshToken.create({ data: newData });

    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  async revokeAll(accountId: string, accountType: AccountType) {
    await this.prisma.refreshToken.updateMany({
      where: { accountId, accountType, revokedAt: null },
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
