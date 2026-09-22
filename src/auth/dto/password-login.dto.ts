import { IsString, Matches, MinLength } from 'class-validator';

export class PasswordLoginDto {
  @IsString()
  @Matches(/^(\+?251|0)?9\d{8}$/, { message: 'Invalid Ethiopian phone' })
  phone: string;

  @IsString()
  @MinLength(1)
  password: string;
}
