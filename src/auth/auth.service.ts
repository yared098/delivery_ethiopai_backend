import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AccountType, CourierStatus, StaffRole } from '@prisma/client';

interface Meta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private otp: OtpService,
    private tokens: TokenService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL')!);
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    if (digits.length === 9) return '251' + digits;
    return '251' + digits;
  }

  // ══════════════════════════════════════════════════
  // SUPER ADMIN LOGIN (Phone + OTP only)
  // ══════════════════════════════════════════════════

  async requestSuperAdminOtp(phone: string) {
    const normalized = this.normalizePhone(phone);
    const staff = await this.prisma.staff.findUnique({ where: { phone: normalized } });

    if (!staff) throw new NotFoundException('No staff account with this phone');
    if (!staff.isActive) throw new UnauthorizedException('Account suspended');

    if (staff.role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only Super Admin uses this login. Staff must use phone + password.',
      );
    }

    await this.otp.requestOtp(phone, AccountType.STAFF, 'login', { staffId: staff.id });
    return { message: 'OTP sent' };
  }

  async verifySuperAdminOtp(phone: string, code: string, meta: Meta) {
    const normalized = await this.otp.verifyOtp(phone, code, AccountType.STAFF, 'login');
    const staff = await this.prisma.staff.findUnique({ where: { phone: normalized } });

    if (!staff) throw new UnauthorizedException('Staff not found');
    if (!staff.isActive) throw new UnauthorizedException('Account suspended');
    if (staff.role !== StaffRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Not a Super Admin account');
    }

    if (!staff.phoneVerified) {
      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { phoneVerified: true },
      });
    }

    const tokens = await this.tokens.issueTokens(
      {
        sub: staff.id,
        accountType: AccountType.STAFF,
        role: staff.role,
        regionId: staff.regionId,
        branchId: staff.branchId,
      },
      meta,
    );

    return { account: this.publicStaff(staff), accountType: AccountType.STAFF, ...tokens };
  }

  // ══════════════════════════════════════════════════
  // STAFF LOGIN (Phone + Password → OTP)
  // REGIONAL_ADMIN, BRANCH_MANAGER
  // ══════════════════════════════════════════════════

  /**
   * STEP 1: Verify password, then send OTP
   */
  async staffLoginStep1(phone: string, password: string) {
    const normalized = this.normalizePhone(phone);
    const staff = await this.prisma.staff.findUnique({ where: { phone: normalized } });

    if (!staff) {
      throw new UnauthorizedException('Invalid phone or password');
    }
    if (!staff.isActive) {
      throw new UnauthorizedException('Account suspended. Contact Super Admin.');
    }
    if (staff.role === StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Super Admin uses OTP-only login. Use the Super Admin tab.',
      );
    }
    if (!staff.passwordHash) {
      throw new UnauthorizedException(
        'No password set. Contact Super Admin to set your password.',
      );
    }

    // Verify password
    const valid = await argon2.verify(staff.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid phone or password');
    }

    // Generate one-time temp token (5 minutes)
    const tempToken = randomUUID();
    await this.redis.setex(
      `staff:login:${tempToken}`,
      300,
      JSON.stringify({
        staffId: staff.id,
        phone: normalized,
        createdAt: Date.now(),
      }),
    );

    // Send OTP to the staff phone
    await this.otp.requestOtp(phone, AccountType.STAFF, 'login', { staffId: staff.id });

    return {
      requiresOtp: true,
      tempToken,
      phone: normalized,
      maskedPhone: this.maskPhone(normalized),
      message: 'OTP sent to your phone',
    };
  }

  /**
   * STEP 2: Verify OTP with temp token, then issue JWT
   */
  async staffLoginStep2(tempToken: string, code: string, meta: Meta) {
    const stored = await this.redis.get(`staff:login:${tempToken}`);
    if (!stored) {
      throw new UnauthorizedException('Login session expired. Please try again.');
    }

    const { staffId, phone } = JSON.parse(stored);

    // Verify OTP
    await this.otp.verifyOtp(phone, code, AccountType.STAFF, 'login');

    // Fetch staff
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new UnauthorizedException('Staff not found');
    if (!staff.isActive) throw new UnauthorizedException('Account suspended');

    // Consume the temp token
    await this.redis.del(`staff:login:${tempToken}`);

    // Mark phone as verified
    if (!staff.phoneVerified) {
      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { phoneVerified: true },
      });
    }

    const tokens = await this.tokens.issueTokens(
      {
        sub: staff.id,
        accountType: AccountType.STAFF,
        role: staff.role,
        regionId: staff.regionId,
        branchId: staff.branchId,
      },
      meta,
    );

    return {
      account: this.publicStaff(staff),
      accountType: AccountType.STAFF,
      mustChangePassword: staff.mustChangePassword,
      ...tokens,
    };
  }

  // ══════════════════════════════════════════════════
  // COURIER (Phone + OTP)
  // ══════════════════════════════════════════════════

  async requestCourierOtp(phone: string) {
    const normalized = this.normalizePhone(phone);
    const courier = await this.prisma.courier.findUnique({ where: { phone: normalized } });
    if (!courier) throw new NotFoundException('No courier account with this phone');
    if (!courier.isActive) throw new UnauthorizedException('Courier suspended');
    if (courier.status !== CourierStatus.APPROVED) {
      throw new UnauthorizedException(`Courier account is ${courier.status}`);
    }
    await this.otp.requestOtp(phone, AccountType.COURIER, 'login', { courierId: courier.id });
    return { message: 'OTP sent' };
  }

  async verifyCourierOtp(phone: string, code: string, meta: Meta) {
    const normalized = await this.otp.verifyOtp(phone, code, AccountType.COURIER, 'login');
    const courier = await this.prisma.courier.findUnique({ where: { phone: normalized } });
    if (!courier) throw new UnauthorizedException('Courier not found');
    if (!courier.isActive) throw new UnauthorizedException('Courier suspended');
    if (courier.status !== CourierStatus.APPROVED) {
      throw new UnauthorizedException(`Courier status: ${courier.status}`);
    }

    if (!courier.phoneVerified) {
      await this.prisma.courier.update({
        where: { id: courier.id },
        data: { phoneVerified: true },
      });
    }

    const tokens = await this.tokens.issueTokens(
      {
        sub: courier.id,
        accountType: AccountType.COURIER,
        regionId: courier.regionId,
        branchId: courier.branchId,
      },
      meta,
    );

    return { account: this.publicCourier(courier), accountType: AccountType.COURIER, ...tokens };
  }

  // ══════════════════════════════════════════════════
  // CUSTOMER (Phone + OTP)
  // ══════════════════════════════════════════════════

  async requestCustomerOtp(phone: string) {
    await this.otp.requestOtp(phone, AccountType.CUSTOMER, 'login');
    return { message: 'OTP sent' };
  }

  async verifyCustomerOtp(phone: string, code: string, meta: Meta) {
    const normalized = await this.otp.verifyOtp(phone, code, AccountType.CUSTOMER, 'login');

    let customer = await this.prisma.customer.findUnique({ where: { phone: normalized } });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { phone: normalized, phoneVerified: true },
      });
    } else if (!customer.phoneVerified) {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: { phoneVerified: true },
      });
    }

    if (!customer.isActive) throw new UnauthorizedException('Account disabled');

    const tokens = await this.tokens.issueTokens(
      { sub: customer.id, accountType: AccountType.CUSTOMER },
      meta,
    );

    return { account: this.publicCustomer(customer), accountType: AccountType.CUSTOMER, ...tokens };
  }

  // ══════════════════════════════════════════════════
  // SESSION
  // ══════════════════════════════════════════════════

  async refresh(refreshToken: string, meta: Meta) {
    return this.tokens.rotate(refreshToken, meta);
  }

  async logout(refreshToken: string) {
    await this.tokens.revokeByRefreshToken(refreshToken);
    return { message: 'Logged out' };
  }

  async logoutAll(accountId: string, accountType: AccountType) {
    await this.tokens.revokeAll(accountId, accountType);
    return { message: 'All sessions revoked' };
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  private maskPhone(phone: string): string {
    if (phone.length < 6) return phone;
    return phone.slice(0, 4) + '****' + phone.slice(-2);
  }

  private publicStaff(s: any) {
    return {
      id: s.id,
      phone: s.phone,
      name: s.name,
      email: s.email,
      role: s.role,
      regionId: s.regionId,
      branchId: s.branchId,
      phoneVerified: s.phoneVerified,
      mustChangePassword: s.mustChangePassword,
    };
  }

  private publicCourier(c: any) {
    return {
      id: c.id,
      phone: c.phone,
      name: c.name,
      email: c.email,
      regionId: c.regionId,
      branchId: c.branchId,
      vehicleType: c.vehicleType,
      status: c.status,
      rating: c.rating,
      totalDeliveries: c.totalDeliveries,
      phoneVerified: c.phoneVerified,
    };
  }

  private publicCustomer(c: any) {
    return {
      id: c.id,
      phone: c.phone,
      name: c.name,
      email: c.email,
      phoneVerified: c.phoneVerified,
    };
  }
}
