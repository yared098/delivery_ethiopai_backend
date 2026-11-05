import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from '../token.service';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  private readonly logger = new Logger(CustomerJwtStrategy.name);
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
    if (payload.accountType !== AccountType.CUSTOMER) {
      throw new UnauthorizedException('Not a customer token');
    }
    if (
      !(await this.tokens.isSessionActive(
        payload.sub,
        AccountType.CUSTOMER,
        payload.family,
      ))
    ) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
    });
    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Customer not found or inactive');
    }
    this.logger.debug(`Customer JWT validated: ${customer.id}`);
    return {
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      accountType: AccountType.CUSTOMER,
    };
  }
}
