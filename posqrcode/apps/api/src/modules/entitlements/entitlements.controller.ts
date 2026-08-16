import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { EntitlementsService } from './entitlements.service'

@ApiTags('entitlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entitlements')
export class EntitlementsController {
  constructor(private readonly entitlements: EntitlementsService) {}

  @Get(':restaurantId')
  get(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.entitlements.forRestaurant(user, restaurantId)
  }
}
