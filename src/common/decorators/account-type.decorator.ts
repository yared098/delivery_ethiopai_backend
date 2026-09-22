import { SetMetadata } from '@nestjs/common';
import { AccountType } from '@prisma/client';

export const ACCOUNT_TYPE_KEY = 'accountType';
export const RequireAccount = (...types: AccountType[]) =>
  SetMetadata(ACCOUNT_TYPE_KEY, types);
