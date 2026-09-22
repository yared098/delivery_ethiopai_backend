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
import { PasswordLoginDto } from './dto/password-login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // ══════════════════════════════════════════════════
  // STAFF (Super Admin, Regional Admin, Branch Manager)
  // ══════════════════════════════════════════════════

  @Public()
  @Post('staff/otp/request')
  @HttpCode(HttpStatus.OK)
  staffRequestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestStaffOtp(dto.phone);
  }

  @Public()
  @Post('staff/otp/verify')
  @HttpCode(HttpStatus.OK)
  staffVerifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    return this.auth.verifyStaffOtp(dto.phone, dto.code, this.meta(req));
  }

  @Public()
  @Post('staff/password/login')
  @HttpCode(HttpStatus.OK)
  staffPasswordLogin(@Body() dto: PasswordLoginDto, @Req() req: any) {
    return this.auth.staffPasswordLogin(dto.phone, dto.password, this.meta(req));
  }

  // ══════════════════════════════════════════════════
  // COURIER
  // ══════════════════════════════════════════════════

  @Public()
  @Post('courier/otp/request')
  @HttpCode(HttpStatus.OK)
  courierRequestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestCourierOtp(dto.phone);
  }

  @Public()
  @Post('courier/otp/verify')
  @HttpCode(HttpStatus.OK)
  courierVerifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    return this.auth.verifyCourierOtp(dto.phone, dto.code, this.meta(req));
  }

  // ══════════════════════════════════════════════════
  // CUSTOMER
  // ══════════════════════════════════════════════════

  @Public()
  @Post('customer/otp/request')
  @HttpCode(HttpStatus.OK)
  customerRequestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestCustomerOtp(dto.phone);
  }

  @Public()
  @Post('customer/otp/verify')
  @HttpCode(HttpStatus.OK)
  customerVerifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    return this.auth.verifyCustomerOtp(dto.phone, dto.code, this.meta(req));
  }

  // ══════════════════════════════════════════════════
  // SESSION
  // ══════════════════════════════════════════════════

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
  logoutAll(@CurrentUser() user: any) {
    return this.auth.logoutAll(user.id, user.accountType);
  }

  private meta(req: any) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }
}
