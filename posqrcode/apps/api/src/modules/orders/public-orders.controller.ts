import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CreateOrderSchema } from '@bear360/shared'
import { ZodError } from 'zod'
import { OrdersService } from './orders.service'
import { PrismaService } from '../../prisma/prisma.service'

/** Public guest QR routes — venue-scoped, no JWT. */
@ApiTags('public-orders')
@Controller('public/r/:restaurantId')
export class PublicOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async venue(@Param('restaurantId') restaurantId: string) {
    const r = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!r) return { code: 'NOT_FOUND', message: 'Restaurant not found' }
    const settings = (r.settings ?? {}) as Record<string, unknown>
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      phone: r.phone,
      address: r.address,
      city: r.city,
      cuisine: r.cuisine,
      whatsapp: r.whatsapp,
      mapsLink: r.mapsLink,
      emoji: r.emoji,
      logoImage: r.logoImage,
      coverImage: r.coverImage,
      isOpen: r.isOpen,
      opensAt: r.opensAt,
      closesAt: r.closesAt,
      currency: r.currency,
      gstRatePct: Number(r.gstRatePct),
      industryId: r.industryId,
      settings: {
        venueOps: settings.venueOps ?? null,
        serviceConfig: settings.serviceConfig ?? null,
        orderTypes: settings.orderTypes ?? null,
        counterOrdering: settings.counterOrdering ?? true,
        deliveryFee: settings.deliveryFee ?? 40,
        enabledLocales: settings.enabledLocales ?? ['en', 'ta', 'hi'],
        defaultLocale: settings.defaultLocale ?? 'en',
        menuAppearance: settings.menuAppearance ?? null,
      },
    }
  }

  @Get('tables/:tableId')
  async table(
    @Param('restaurantId') restaurantId: string,
    @Param('tableId') tableId: string,
  ) {
    const t = await this.prisma.diningTable.findFirst({
      where: { restaurantId, OR: [{ id: tableId }, { number: Number(tableId) || -1 }] },
    })
    if (!t) return { code: 'NOT_FOUND', message: 'Table not found' }
    return {
      id: t.id,
      name: t.name,
      number: t.number,
      seats: t.seats,
      status: t.status,
      zone: t.zone,
    }
  }

  @Get('menu')
  async menu(@Param('restaurantId') restaurantId: string) {
    const [categories, items] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where: { restaurantId },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.menuItem.findMany({
        where: { restaurantId, active: true, available: true },
        orderBy: { name: 'asc' },
      }),
    ])
    const cats =
      categories.length > 0
        ? categories.map((c) => ({
            id: c.id,
            name: c.name,
            emoji: c.emoji,
            sortOrder: c.sortOrder,
          }))
        : [{ id: 'uncategorized', name: 'Menu', emoji: '🍽️', sortOrder: 0 }]
    const fallbackCat = cats[0]!.id
    return {
      categories: cats,
      items: items.map((i) => ({
        id: i.id,
        categoryId: i.categoryId || fallbackCat,
        name: i.name,
        description: i.description,
        price: Number(i.price),
        veg: i.veg,
        spicy: i.spicy,
        available: i.available,
        popular: i.popular,
        image: i.image,
      })),
    }
  }

  @Post('orders')
  create(@Param('restaurantId') restaurantId: string, @Body() body: unknown) {
    try {
      const input = CreateOrderSchema.parse({ ...(body as object), restaurantId })
      return this.orders.create(input)
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid order payload',
          details: e.flatten(),
        })
      }
      throw e
    }
  }

  @Get('orders/:orderId')
  async track(
    @Param('restaurantId') restaurantId: string,
    @Param('orderId') orderId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
    })
    if (!order) return { code: 'NOT_FOUND', message: 'Order not found' }
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      total: Number(order.total),
      updatedAt: order.updatedAt.toISOString(),
    }
  }
}
