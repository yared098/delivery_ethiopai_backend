import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccountType, StaffRole } from '@prisma/client';

interface JwtPayload {
  sub: string;
  accountType: AccountType;
  role?: StaffRole;
  regionId?: string | null;
  branchId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(
      `JWT validated: sub=${payload.sub}, accountType=${payload.accountType}, role=${payload.role}`,
    );
    return {
      id: payload.sub,
      accountType: payload.accountType,   // ← MUST return this
      role: payload.role,
      regionId: payload.regionId,
      branchId: payload.branchId,
    };
  }
}
