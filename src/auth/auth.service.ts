import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType, CourierStatus } from '@prisma/client';

interface Meta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private otp: OtpService,
    private tokens: TokenService,
    private prisma: PrismaService,
  ) {}

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    if (digits.length === 9) return '251' + digits;
    return '251' + digits;
  }

  // ══════════════════════════════════════════════════
  // STAFF
  // ══════════════════════════════════════════════════
  async requestStaffOtp(phone: string) {
    const normalized = this.normalizePhone(phone);
    const staff = await this.prisma.staff.findUnique({ where: { phone: normalized } });
    if (!staff) throw new NotFoundException('No staff account with this phone');
    if (!staff.isActive) throw new UnauthorizedException('Account suspended');
    await this.otp.requestOtp(phone, AccountType.STAFF, 'login', { staffId: staff.id });
    return { message: 'OTP sent' };
  }

  async verifyStaffOtp(phone: string, code: string, meta: Meta) {
    const normalized = await this.otp.verifyOtp(phone, code, AccountType.STAFF, 'login');
    const staff = await this.prisma.staff.findUnique({ where: { phone: normalized } });
    if (!staff) throw new UnauthorizedException('Staff not found');
    if (!staff.isActive) throw new UnauthorizedException('Account suspended');

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

  async staffPasswordLogin(phone: string, password: string, meta: Meta) {
    const normalized = this.normalizePhone(phone);
    const staff = await this.prisma.staff.findUnique({ where: { phone: normalized } });

    if (!staff || !staff.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!staff.isActive) throw new UnauthorizedException('Account suspended');

    const valid = await argon2.verify(staff.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

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
  // COURIER
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
  // CUSTOMER
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
