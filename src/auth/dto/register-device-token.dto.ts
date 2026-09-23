import { IsString, IsIn, Length } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @Length(20, 500)
  token!: string;

  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform!: 'android' | 'ios' | 'web';
}