import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  canTransitionOrder,
  type CreateOrderInput,
  type OrderDto,
  type OrderStatus,
} from '@bear360/shared'
import type { Order, OrderType as PrismaOrderType } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { TenantsService } from '../tenants/tenants.service'
import type { JwtPayload } from '../auth/jwt-payload'
import { OrdersGateway } from '../realtime/orders.gateway'

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly gateway: OrdersGateway,
  ) {}

  async list(user: JwtPayload, restaurantId: string, status?: OrderStatus) {
    this.tenants.assertAccess(user, restaurantId)
    const rows = await this.prisma.order.findMany({
      where: {
        restaurantId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return rows.map(toDto)
  }

  async get(user: JwtPayload, restaurantId: string, orderId: string) {
    this.tenants.assertAccess(user, restaurantId)
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
    })
    if (!order) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Order not found' })
    return toDto(order)
  }

  async create(input: CreateOrderInput, user?: JwtPayload): Promise<OrderDto> {
    if (user) this.tenants.assertAccess(user, input.restaurantId)

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
    })
    if (!restaurant) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Restaurant not found' })
    if (restaurant.isOpen === false) {
      throw new BadRequestException({
        code: 'STORE_CLOSED',
        message: 'Restaurant is currently closed for orders',
      })
    }

    const subtotal = input.lines.reduce(
      (s: number, l: { unitPrice: number; qty: number }) => s + l.unitPrice * l.qty,
      0,
    )
    const taxRate = Number(restaurant.gstRatePct) / 100
    const tax = Math.round(subtotal * taxRate * 100) / 100
    const deliveryFee = Math.max(0, Number(input.deliveryFee ?? 0))
    const parcelFee = Math.max(0, Number(input.parcelFee ?? 0))
    const fees = deliveryFee + parcelFee
    const total = Math.round((subtotal + tax + fees) * 100) / 100
    const number = await this.nextNumber(input.restaurantId)
    const feeNote =
      fees > 0
        ? [
            deliveryFee > 0 ? `deliveryFee=${deliveryFee}` : null,
            parcelFee > 0 ? `parcelFee=${parcelFee}` : null,
          ]
            .filter(Boolean)
            .join(' ')
        : ''
    const notes = [input.notes?.trim(), feeNote].filter(Boolean).join(' · ') || undefined

    const order = await this.prisma.order.create({
      data: {
        restaurantId: input.restaurantId,
        number,
        tableId: input.tableId,
        type: toPrismaType(input.type),
        channel: input.channel,
        status: input.paid ? 'paid' : 'pending',
        lines: input.lines,
        subtotal,
        tax,
        total,
        guestName: input.guestName,
        guestPhone: input.guestPhone,
        notes,
        paymentMethod: input.paymentMethod,
        paid: Boolean(input.paid),
      },
    })

    const dto = toDto(order)
    this.gateway.emitOrderCreated(input.restaurantId, dto)
    return dto
  }

  async updateStatus(
    user: JwtPayload,
    restaurantId: string,
    orderId: string,
    status: OrderStatus,
  ): Promise<OrderDto> {
    this.tenants.assertAccess(user, restaurantId)
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
    })
    if (!order) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Order not found' })

    const from = order.status as OrderStatus
    if (!canTransitionOrder(from, status)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot move order from ${from} to ${status}`,
      })
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        ...(status === 'paid' ? { paid: true } : {}),
      },
    })
    const dto = toDto(updated)
    this.gateway.emitOrderStatus(restaurantId, dto)
    this.gateway.emitOrderUpdated(restaurantId, dto)
    return dto
  }

  private async nextNumber(restaurantId: string): Promise<string> {
    const count = await this.prisma.order.count({ where: { restaurantId } })
    return `B${String(count + 1).padStart(4, '0')}`
  }
}

function toPrismaType(type: CreateOrderInput['type']): PrismaOrderType {
  if (type === 'dine-in') return 'dine_in'
  return type
}

function fromPrismaType(type: PrismaOrderType): CreateOrderInput['type'] {
  if (type === 'dine_in') return 'dine-in'
  return type
}

function toDto(order: Order): OrderDto {
  return {
    id: order.id,
    number: order.number,
    restaurantId: order.restaurantId,
    tableId: order.tableId,
    type: fromPrismaType(order.type),
    channel: order.channel,
    status: order.status as OrderStatus,
    lines: order.lines as OrderDto['lines'],
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    total: Number(order.total),
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    notes: order.notes,
    paymentMethod: order.paymentMethod,
    paid: order.paid,
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}
