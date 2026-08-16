import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { MenuCategorySchema, MenuItemUpsertSchema } from '@bear360/shared'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { CatalogService } from './catalog.service'

@ApiTags('menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants/:restaurantId/menu')
export class MenuController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.catalog.listMenu(user, restaurantId)
  }

  @Post('categories')
  upsertCategory(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.catalog.upsertCategory(user, restaurantId, MenuCategorySchema.parse(body))
  }

  @Delete('categories/:id')
  removeCategory(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.catalog.removeCategory(user, restaurantId, id)
  }

  @Post('items')
  upsertItem(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.catalog.upsertItem(user, restaurantId, MenuItemUpsertSchema.parse(body))
  }

  @Delete('items/:id')
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.catalog.removeItem(user, restaurantId, id)
  }
}
