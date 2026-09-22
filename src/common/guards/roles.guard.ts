import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountType, StaffRole } from '@prisma/client';
import { STAFF_ROLES_KEY } from '../decorators/staff-roles.decorator';
import { ACCOUNT_TYPE_KEY } from '../decorators/account-type.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredStaffRoles = this.reflector.getAllAndOverride<StaffRole[]>(
      STAFF_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAccountTypes = this.reflector.getAllAndOverride<AccountType[]>(
      ACCOUNT_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const { user } = context.switchToHttp().getRequest();

    // ──────────────────────────────────────────────
    // DEBUG LOG
    // ──────────────────────────────────────────────
    console.log('🔍 RolesGuard:', {
      url: context.switchToHttp().getRequest().url,
      hasUser: !!user,
      user: user ? { id: user.id, accountType: user.accountType, role: user.role } : null,
      requiredStaffRoles,
      requiredAccountTypes,
    });

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // No role/account requirements → allow
    if (!requiredStaffRoles?.length && !requiredAccountTypes?.length) {
      return true;
    }

    // Account type check
    if (requiredAccountTypes?.length) {
      if (!requiredAccountTypes.includes(user.accountType)) {
        throw new ForbiddenException(
          `Wrong account type: need ${requiredAccountTypes.join('/')}, got ${user.accountType}`,
        );
      }
    }

    // Staff role check
    if (requiredStaffRoles?.length) {
      if (user.accountType !== AccountType.STAFF) {
        throw new ForbiddenException(
          `Staff access only (accountType=${user.accountType})`,
        );
      }
      if (!requiredStaffRoles.includes(user.role)) {
        throw new ForbiddenException(
          `Insufficient role: need ${requiredStaffRoles.join('/')}, got ${user.role}`,
        );
      }
    }

    return true;
  }
}
