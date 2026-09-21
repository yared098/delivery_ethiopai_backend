import {
  Body,
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LinkPhoneDto } from './dto/link-phone.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // ---------- PHONE OTP ----------

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    return this.auth.verifyOtp(dto.phone, dto.code, this.meta(req));
  }

  // ---------- GOOGLE ----------

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleLogin(@Body() dto: GoogleLoginDto, @Req() req: any) {
    return this.auth.googleLogin(dto.idToken, this.meta(req));
  }

  @Post('link-phone/request')
  @HttpCode(HttpStatus.OK)
  requestLinkPhone(@CurrentUser('id') userId: string, @Body() dto: RequestOtpDto) {
    return this.auth.requestLinkPhone(userId, dto.phone);
  }

  @Post('link-phone/verify')
  @HttpCode(HttpStatus.OK)
  verifyLinkPhone(@CurrentUser('id') userId: string, @Body() dto: LinkPhoneDto) {
    return this.auth.verifyLinkPhone(userId, dto.phone, dto.code);
  }

  // ---------- SESSION ----------

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: any) {
    return this.auth.refresh(dto.refreshToken, this.meta(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@CurrentUser('id') userId: string) {
    return this.auth.logoutAll(userId);
  }

  private meta(req: any) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }
}
