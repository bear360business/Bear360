import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { DiningTableSchema } from '@bear360/shared'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { CatalogService } from './catalog.service'

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants/:restaurantId/tables')
export class TablesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.catalog.listTables(user, restaurantId)
  }

  @Post()
  upsert(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.catalog.upsertTable(user, restaurantId, DiningTableSchema.parse(body))
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.catalog.removeTable(user, restaurantId, id)
  }
}
