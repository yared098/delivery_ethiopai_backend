import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CourierStatus } from '@prisma/client';

@Injectable()
export class CourierJwtStrategy extends PassportStrategy(Strategy, 'courier-jwt') {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: any) {
    if (payload.accountType !== 'COURIER') {
      throw new UnauthorizedException('Not a courier token');
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
      accountType: 'COURIER',
      regionId: courier.regionId,
      branchId: courier.branchId,
    };
  }
}