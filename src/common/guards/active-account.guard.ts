import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class ActiveAccountGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new UnauthorizedException('Not authenticated');

    // Already checked in JwtStrategy, but this double-checks for
    // routes that don't use JwtAuthGuard properly.
    if (user.accountType === AccountType.STAFF) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: user.id },
        select: { isActive: true, suspendedAt: true },
      });
      if (!staff || !staff.isActive || staff.suspendedAt) {
        throw new ForbiddenException('Account suspended');
      }
    }

    return true;
  }
}