import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { PlatformService } from './platform.service'

@ApiTags('platform')
@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Post('public/leads')
  createPublicLead(@Body() body: Record<string, unknown>) {
    const lead = {
      id: `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      name: String(body.name ?? '').trim(),
      email: String(body.email ?? '').trim().toLowerCase(),
      phone: String(body.phone ?? '').trim(),
      businessName: String(body.businessName ?? '').trim(),
      city: String(body.city ?? '').trim(),
      interest: body.interest ?? 'demo',
      message: String(body.message ?? '').trim(),
      status: 'new',
      createdAt: new Date().toISOString(),
      toEmail: 'anya@bear360.app',
    }
    return this.platform.appendLead(lead)
  }

  @Get('public/platform-ui')
  getPublicPlatformUi() {
    return this.platform.getPublicUiFlags()
  }

  @Get('platform/config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getConfig(@CurrentUser() user: JwtPayload) {
    return this.platform.getFlags(user)
  }

  @Put('platform/config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  putConfig(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.platform.patchFlags(user, body ?? {})
  }

  @Get('restaurants/:restaurantId/data/:bag')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getBag(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('bag') bag: string,
  ) {
    return this.platform.getVenueBag(user, restaurantId, bag)
  }

  @Put('restaurants/:restaurantId/data/:bag')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  putBag(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('bag') bag: string,
    @Body() body: unknown,
  ) {
    return this.platform.putVenueBag(user, restaurantId, bag, body)
  }
}
