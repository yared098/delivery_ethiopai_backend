import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccountType, StaffRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  accountType: AccountType;
  role?: StaffRole;
  regionId?: string | null;
  branchId?: string | null;
  iat?: number;   // ← issued-at (added automatically by JWT)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    config: ConfigService,
    private prisma: PrismaService,   // ← ADD
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    const { sub, accountType, iat } = payload;

    // ══════════════════════════════════════════════════
    // STAFF
    // ══════════════════════════════════════════════════
    if (accountType === AccountType.STAFF) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: sub },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          role: true,
          regionId: true,
          branchId: true,
          isActive: true,
          suspendedAt: true,
          passwordChangedAt: true,
          mustChangePassword: true,
        },
      });

      if (!staff) {
        this.logger.warn(`Staff not found: ${sub}`);
        throw new UnauthorizedException('Account not found');
      }

      // 🔴 Suspended → block immediately
      if (!staff.isActive || staff.suspendedAt) {
        this.logger.warn(`Suspended staff tried to access: ${sub}`);
        throw new UnauthorizedException('Account suspended');
      }

      // 🔴 Password changed after token was issued → force re-login
      if (
        staff.passwordChangedAt &&
        iat &&
        Math.floor(staff.passwordChangedAt.getTime() / 1000) > iat
      ) {
        this.logger.warn(`Stale token (password changed): ${sub}`);
        throw new UnauthorizedException(
          'Password changed. Please log in again.',
        );
      }

      this.logger.debug(
        `JWT validated: sub=${sub}, accountType=${accountType}, role=${staff.role}`,
      );

      // Return FRESH data from DB (not stale JWT payload)
      return {
        id: staff.id,
        phone: staff.phone,
        name: staff.name,
        email: staff.email,
        accountType: AccountType.STAFF,
        role: staff.role,
        regionId: staff.regionId,
        branchId: staff.branchId,
        mustChangePassword: staff.mustChangePassword,
      };
    }

    // ══════════════════════════════════════════════════
    // COURIER
    // ══════════════════════════════════════════════════
    if (accountType === AccountType.COURIER) {
      const courier = await this.prisma.courier.findUnique({
        where: { id: sub },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          regionId: true,
          branchId: true,
          isActive: true,
          status: true,
          suspendedAt: true,
          passwordChangedAt: true,
        },
      });

      if (!courier) {
        this.logger.warn(`Courier not found: ${sub}`);
        throw new UnauthorizedException('Account not found');
      }

      if (!courier.isActive || courier.suspendedAt) {
        this.logger.warn(`Suspended courier tried to access: ${sub}`);
        throw new UnauthorizedException('Courier suspended');
      }

      if (courier.status !== 'APPROVED') {
        this.logger.warn(`Unapproved courier tried to access: ${sub}`);
        throw new UnauthorizedException(`Courier status: ${courier.status}`);
      }

      if (
        courier.passwordChangedAt &&
        iat &&
        Math.floor(courier.passwordChangedAt.getTime() / 1000) > iat
      ) {
        throw new UnauthorizedException(
          'Password changed. Please log in again.',
        );
      }

      return {
        id: courier.id,
        phone: courier.phone,
        name: courier.name,
        email: courier.email,
        accountType: AccountType.COURIER,
        regionId: courier.regionId,
        branchId: courier.branchId,
      };
    }

    // ══════════════════════════════════════════════════
    // CUSTOMER
    // ══════════════════════════════════════════════════
    if (accountType === AccountType.CUSTOMER) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: sub },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          isActive: true,
        },
      });

      if (!customer) {
        this.logger.warn(`Customer not found: ${sub}`);
        throw new UnauthorizedException('Account not found');
      }

      if (!customer.isActive) {
        this.logger.warn(`Disabled customer tried to access: ${sub}`);
        throw new UnauthorizedException('Account disabled');
      }

      return {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        accountType: AccountType.CUSTOMER,
      };
    }

    // Unknown account type
    this.logger.warn(`Invalid account type in JWT: ${accountType}`);
    throw new UnauthorizedException('Invalid account type');
  }
}