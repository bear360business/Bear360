import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import {
  LoginPasswordSchema,
  LoginStaffPinSchema,
  RefreshTokenSchema,
  RegisterSchema,
  RequestOtpSchema,
  ResetPasswordSchema,
  VerifyOtpSchema,
} from '@bear360/shared'
import { AuthService } from './auth.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: unknown) {
    return this.auth.loginPassword(LoginPasswordSchema.parse(body))
  }

  @Post('staff-login')
  staffLogin(@Body() body: unknown) {
    return this.auth.loginStaffPin(LoginStaffPinSchema.parse(body))
  }

  @Post('refresh')
  refresh(@Body() body: unknown) {
    const input = RefreshTokenSchema.parse(body)
    return this.auth.refresh(input.refreshToken)
  }

  @Post('logout')
  logout(@Body() body: unknown) {
    const input = RefreshTokenSchema.parse(body)
    return this.auth.logout(input.refreshToken)
  }

  @Post('otp/request')
  requestOtp(@Body() body: unknown) {
    return this.auth.requestOtp(RequestOtpSchema.parse(body))
  }

  @Post('otp/verify')
  verifyOtp(@Body() body: unknown) {
    return this.auth.verifyOtp(VerifyOtpSchema.parse(body))
  }

  @Post('register')
  register(@Body() body: unknown) {
    return this.auth.register(RegisterSchema.parse(body))
  }

  @Post('password/reset')
  resetPassword(@Body() body: unknown) {
    return this.auth.resetPassword(ResetPasswordSchema.parse(body))
  }
}
