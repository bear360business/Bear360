import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import {
  CreateOrderSchema,
  UpdateOrderSchema,
  UpdateOrderStatusSchema,
  type OrderStatus,
} from '@bear360/shared'
import { CurrentUser } from '../../common/current-user.decorator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { JwtPayload } from '../auth/jwt-payload'
import { OrdersService } from './orders.service'

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants/:restaurantId/orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orders.list(user, restaurantId, status)
  }

  @Get(':orderId')
  get(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.orders.get(user, restaurantId, orderId)
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() body: unknown,
  ) {
    const input = CreateOrderSchema.parse({ ...(body as object), restaurantId })
    return this.orders.create(input, user)
  }

  @Post(':orderId/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() body: unknown,
  ) {
    const input = UpdateOrderStatusSchema.parse(body)
    return this.orders.updateStatus(user, restaurantId, orderId, input.status)
  }

  @Patch(':orderId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
    @Body() body: unknown,
  ) {
    const input = UpdateOrderSchema.parse(body)
    return this.orders.update(user, restaurantId, orderId, input)
  }

  @Delete(':orderId')
  delete(
    @CurrentUser() user: JwtPayload,
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.orders.delete(user, restaurantId, orderId)
  }
}
