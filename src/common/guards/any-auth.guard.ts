import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnyAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = auth.slice(7);

    try {
      const payload: any = this.jwt.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,      // ← FIX
      });

      const { sub, accountType } = payload;

      if (accountType === 'CUSTOMER') {
        const c = await this.prisma.customer.findUnique({ where: { id: sub } });
        if (!c || !c.isActive) throw new UnauthorizedException('Invalid customer');
        req.customer = c;
      } else if (accountType === 'STAFF') {
        const s = await this.prisma.staff.findUnique({ where: { id: sub } });
        if (!s || !s.isActive) throw new UnauthorizedException('Invalid staff');
        req.staff = s;
      } else if (accountType === 'COURIER') {
        const cr = await this.prisma.courier.findUnique({ where: { id: sub } });
        if (!cr || !cr.isActive) throw new UnauthorizedException('Invalid courier');
        req.courier = cr;
      } else {
        throw new UnauthorizedException('Unknown account type');
      }

      req.user = payload;
      req.accountType = accountType;
      return true;
    } catch (e: any) {
      // Add debug log
      console.error('🔴 [AnyAuthGuard] FAILED:', {
        message: e.message,
        secretUsed: process.env.JWT_ACCESS_SECRET ? 'defined' : 'UNDEFINED',
        tokenPrefix: token.slice(0, 20),
      });
      throw new UnauthorizedException(e.message || 'Invalid token');
    }
  }
}