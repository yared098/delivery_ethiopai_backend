import { Controller, Get } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireAccount } from '../common/decorators/account-type.decorator';
import { AccountType } from '@prisma/client';

@Controller('staff')
export class StaffController {
  constructor(private staff: StaffService) {}

  @Get('me')
  @RequireAccount(AccountType.STAFF)
  me(@CurrentUser('id') id: string) {
    return this.staff.findById(id);
  }
}
