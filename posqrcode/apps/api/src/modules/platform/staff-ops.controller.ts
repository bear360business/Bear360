import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { PlatformService } from '../platform/platform.service'

@ApiTags('staff-ops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants/:restaurantId/staff-ops')
export class StaffOpsController {
  constructor(private readonly platform: PlatformService) {}

  @Get('attendance')
  getAttendance(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.platform.getVenueBag(user, restaurantId, 'attendance')
  }

  @Put('attendance')
  putAttendance(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.platform.putVenueBag(user, restaurantId, 'attendance', body ?? [])
  }

  @Get('payroll')
  getPayroll(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.platform.getVenueBag(user, restaurantId, 'payroll')
  }

  @Put('payroll')
  putPayroll(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.platform.putVenueBag(user, restaurantId, 'payroll', body ?? {})
  }

  @Get('shifts')
  getShifts(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.platform.getVenueBag(user, restaurantId, 'shifts')
  }

  @Put('shifts')
  putShifts(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.platform.putVenueBag(user, restaurantId, 'shifts', body ?? [])
  }
}
