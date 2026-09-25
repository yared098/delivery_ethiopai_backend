import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './jwt.strategy';
import { CustomerJwtStrategy } from './customer-jwt.strategy';
import { NotificationsModule } from 'src/notifications/notifications.module';


@Module({
  imports: [PassportModule, NotificationsModule,JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokenService, JwtStrategy,CustomerJwtStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
