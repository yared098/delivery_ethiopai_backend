import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^(\+?251|0)?9\d{8}$/, { message: 'Invalid Ethiopian phone number' })
  phone: string;
}
