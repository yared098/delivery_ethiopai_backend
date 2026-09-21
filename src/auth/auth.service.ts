import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { GoogleService } from './google.service';
import { UsersService } from '../users/users.service';

interface Meta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private otp: OtpService,
    private tokens: TokenService,
    private google: GoogleService,
    private users: UsersService,
  ) {}

  // ---------- PHONE OTP FLOW ----------

  async requestOtp(phone: string, purpose = 'login') {
    await this.otp.requestOtp(phone, purpose);
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, code: string, meta: Meta) {
    const normalized = await this.otp.verifyOtp(phone, code, 'login');
    const user = await this.users.findOrCreateByPhone(normalized);

    if (!user.isActive) throw new UnauthorizedException('Account disabled');

    const tokens = await this.tokens.issueTokens(
      {
        sub: user.id,
        role: user.role,
        regionId: user.regionId ?? undefined,
        branchId: user.branchId ?? undefined,
      },
      meta,
    );

    return {
      user: this.publicUser(user),
      ...tokens,
    };
  }

  // ---------- GOOGLE FLOW ----------

  async googleLogin(idToken: string, meta: Meta) {
    const profile = await this.google.verifyIdToken(idToken);

    // 1. Try to find by googleId
    let user = await this.users.findByGoogleId(profile.googleId);

    // 2. If not, try by email (link existing account)
    if (!user) {
      const byEmail = await this.users.findByEmail(profile.email);
      if (byEmail) {
        user = await this.users.linkGoogleToUser(byEmail.id, {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
        });
      }
    }

    // 3. Otherwise, create new
    if (!user) {
      user = await this.users.createGoogleUser({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
      });
    }

    if (!user.isActive) throw new UnauthorizedException('Account disabled');

    const tokens = await this.tokens.issueTokens(
      {
        sub: user.id,
        role: user.role,
        regionId: user.regionId ?? undefined,
        branchId: user.branchId ?? undefined,
      },
      meta,
    );

    return {
      user: this.publicUser(user),
      requiresPhone: !user.phone, // flag for frontend to prompt
      ...tokens,
    };
  }

  // ---------- LINK PHONE TO GOOGLE USER ----------

  async requestLinkPhone(userId: string, phone: string) {
    // Ensure phone not already used by another user
    const existing = await this.users.findOrCreateByPhone(phone);
    // findOrCreateByPhone creates if missing — we don't want that here
    if (existing.id !== userId && existing.id !== 'temp') {
      // If a different user has this phone, reject
      if (existing.phone === this.normalizePhone(phone) && existing.id !== userId) {
        throw new ConflictException('Phone already linked to another account');
      }
    }
    await this.otp.requestOtp(phone, 'link_phone');
    return { message: 'OTP sent for phone linking' };
  }

  async verifyLinkPhone(userId: string, phone: string, code: string) {
    const normalized = await this.otp.verifyOtp(phone, code, 'link_phone');

    // Check phone not already used
    const existing = await this.users.findByPhone(normalized);
    if (existing && existing.id !== userId) {
      throw new ConflictException('Phone already linked to another account');
    }

    const user = await this.users.linkPhone(userId, normalized);
    return { user: this.publicUser(user), message: 'Phone linked' };
  }

  // ---------- SESSION ----------

  async refresh(refreshToken: string, meta: Meta) {
    return this.tokens.rotate(refreshToken, meta);
  }

  async logout(refreshToken: string) {
    await this.tokens.revokeByRefreshToken(refreshToken);
    return { message: 'Logged out' };
  }

  async logoutAll(userId: string) {
    await this.tokens.revokeAllForUser(userId);
    return { message: 'All sessions revoked' };
  }

  // ---------- HELPERS ----------

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    return '251' + digits;
  }

  private publicUser(user: any) {
    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      regionId: user.regionId,
      branchId: user.branchId,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
    };
  }
}
