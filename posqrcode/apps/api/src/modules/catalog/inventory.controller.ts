import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { IngredientUpsertSchema, PurchaseCreateSchema } from '@bear360/shared'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { CatalogService } from './catalog.service'

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants/:restaurantId/inventory')
export class InventoryController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('ingredients')
  listIngredients(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.catalog.listIngredients(user, restaurantId)
  }

  @Post('ingredients')
  upsertIngredient(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.catalog.upsertIngredient(user, restaurantId, IngredientUpsertSchema.parse(body))
  }

  @Delete('ingredients/:id')
  removeIngredient(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.catalog.removeIngredient(user, restaurantId, id)
  }

  @Get('purchases')
  listPurchases(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.catalog.listPurchases(user, restaurantId)
  }

  @Post('purchases')
  createPurchase(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.catalog.createPurchase(user, restaurantId, PurchaseCreateSchema.parse(body))
  }

  @Post('ingredients/:id/stock')
  adjustStock(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
    @Body() body: { stock?: number },
  ) {
    return this.catalog.adjustStock(user, restaurantId, id, Number(body?.stock ?? 0))
  }
}
