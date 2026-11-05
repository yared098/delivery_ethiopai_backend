import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType, CourierStatus } from '@prisma/client';
import { TokenService } from '../token.service';

@Injectable()
export class CourierJwtStrategy extends PassportStrategy(Strategy, 'courier-jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private tokens: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: { sub: string; accountType: AccountType; family?: string }) {
    if (payload.accountType !== AccountType.COURIER) {
      throw new UnauthorizedException('Not a courier token');
    }
    if (
      !(await this.tokens.isSessionActive(
        payload.sub,
        AccountType.COURIER,
        payload.family,
      ))
    ) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
    const courier = await this.prisma.courier.findUnique({
      where: { id: payload.sub },
    });
    if (!courier || !courier.isActive) {
      throw new UnauthorizedException('Courier not found or inactive');
    }
    if (courier.status !== CourierStatus.APPROVED) {
      throw new UnauthorizedException(`Courier status: ${courier.status}`);
    }
    return {
      id: courier.id,
      accountType: AccountType.COURIER,
      regionId: courier.regionId,
      branchId: courier.branchId,
    };
  }
}