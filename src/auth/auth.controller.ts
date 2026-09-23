import {
  Body,
  Controller,
  Post,
  Req,
   Get,           // ← ADD
  Patch, 
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';  // ← ADD

import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CustomerJwtGuard } from 'src/common/guards/customer-jwt.guard';
import { CurrentCustomer } from 'src/common/decorators/current-customer.decorator';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

class StaffLoginStep1Dto {
  @IsString()
  phone: string;

  @IsString()
  password: string;
}

class StaffLoginStep2Dto {
  @IsString()
  tempToken: string;

  @IsString()
  code: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // ══════════════════════════════════════════════════
  // SUPER ADMIN (Phone + OTP only)
  // ══════════════════════════════════════════════════

  @Public()
  @Post('super-admin/otp/request')
  @HttpCode(HttpStatus.OK)
  superAdminRequestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestSuperAdminOtp(dto.phone);
  }

  @Public()
  @Post('super-admin/otp/verify')
  @HttpCode(HttpStatus.OK)
  superAdminVerifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    return this.auth.verifySuperAdminOtp(dto.phone, dto.code, this.meta(req));
  }

  // ══════════════════════════════════════════════════
  // STAFF (Phone + Password → OTP)
  // ══════════════════════════════════════════════════

  @Public()
  @Post('staff/login')
  @HttpCode(HttpStatus.OK)
  staffLogin(@Body() dto: StaffLoginStep1Dto) {
    return this.auth.staffLoginStep1(dto.phone, dto.password);
  }

  @Public()
  @Post('staff/login/verify')
  @HttpCode(HttpStatus.OK)
  staffLoginVerify(@Body() dto: StaffLoginStep2Dto, @Req() req: any) {
    return this.auth.staffLoginStep2(dto.tempToken, dto.code, this.meta(req));
  }

  // ══════════════════════════════════════════════════
  // COURIER (Phone + OTP)
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
  // CUSTOMER (Phone + OTP)
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
  // CUSTOMER — STEP 3: COMPLETE REGISTRATION
  // Only needed when OTP verify returned isNewUser: true
  // ══════════════════════════════════════════════════

  @Public()
  @Post('customer/register')
  @HttpCode(HttpStatus.CREATED)
  customerRegister(@Body() dto: RegisterCustomerDto, @Req() req: any) {
    return this.auth.registerCustomer(
      dto.registrationToken,
      {
        name: dto.name,
        email: dto.email,
        defaultAddress: dto.defaultAddress,
        defaultLat: dto.defaultLat,
        defaultLng: dto.defaultLng,
      },
      this.meta(req),
    );
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
    // ══════════════════════════════════════════════════
  // CUSTOMER PROFILE (requires customer JWT)
  // ══════════════════════════════════════════════════

  @UseGuards(CustomerJwtGuard)
  @Get('customer/me')
  getCustomerProfile(@CurrentCustomer() customer: any) {
    return this.auth.getCustomerProfile(customer.id);
  }

  @UseGuards(CustomerJwtGuard)
  @Patch('customer/me')
  updateCustomerProfile(
    @CurrentCustomer() customer: any,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.auth.updateCustomerProfile(customer.id, dto);
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

  // ══════════════════════════════════════════════════
  // CUSTOMER — DEVICE TOKEN (FCM)
  // ══════════════════════════════════════════════════

  @UseGuards(CustomerJwtGuard)
  @Post('customer/device-token')
  @HttpCode(HttpStatus.OK)
  registerDeviceToken(
    @CurrentCustomer() customer: any,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.auth.registerCustomerDeviceToken(
      customer.id,
      dto.token,
      dto.platform,
    );
  }

  @UseGuards(CustomerJwtGuard)
  @Post('customer/device-token/remove')
  @HttpCode(HttpStatus.OK)
  removeDeviceToken(
    @CurrentCustomer() customer: any,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.auth.removeCustomerDeviceToken(customer.id, dto.token);
  }

}
