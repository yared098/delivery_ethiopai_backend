import { IsEnum, IsIn, IsString, MinLength } from 'class-validator';
import { AccountType } from '@prisma/client';

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(20, { message: 'Invalid FCM token' })
  token: string;

  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform: 'android' | 'ios' | 'web';

  @IsEnum(AccountType)
  accountType: AccountType;
}