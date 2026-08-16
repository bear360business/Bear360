import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CreateRestaurantSchema, UpdateRestaurantSchema } from '@bear360/shared'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { TenantsService } from './tenants.service'

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.tenants.listForUser(user)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.tenants.create(user, CreateRestaurantSchema.parse(body))
  }

  @Get(':restaurantId')
  getOne(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.tenants.getOne(user, restaurantId)
  }

  @Patch(':restaurantId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.tenants.update(user, restaurantId, UpdateRestaurantSchema.parse(body))
  }

  @Delete(':restaurantId')
  remove(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.tenants.remove(user, restaurantId)
  }
}
