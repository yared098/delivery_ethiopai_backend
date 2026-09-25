import { IsString, MinLength } from 'class-validator';

export class UnregisterDeviceTokenDto {
  @IsString()
  @MinLength(20, { message: 'Invalid FCM token' })
  token: string;
}