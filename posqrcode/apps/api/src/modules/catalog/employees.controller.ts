import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { EmployeeUpsertSchema } from '@bear360/shared'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { CatalogService } from './catalog.service'

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants/:restaurantId/employees')
export class EmployeesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Param('restaurantId') restaurantId: string) {
    return this.catalog.listEmployees(user, restaurantId)
  }

  @Post()
  upsert(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    return this.catalog.upsertEmployee(user, restaurantId, EmployeeUpsertSchema.parse(body))
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('id') id: string,
  ) {
    return this.catalog.removeEmployee(user, restaurantId, id)
  }
}
