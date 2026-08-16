import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { PlanId, Prisma } from '@prisma/client'
import Razorpay from 'razorpay'
import { PrismaService } from '../../prisma/prisma.service'
import { TenantsService } from '../tenants/tenants.service'
import type { JwtPayload } from '../auth/jwt-payload'

const PLAN_AMOUNTS_PAISE: Record<'basic' | 'professional', number> = {
  basic: 999_00,
  professional: 2499_00,
}

const PLAN_NAMES: Record<'basic' | 'professional', string> = {
  basic: 'Bear360 Basic',
  professional: 'Bear360 Professional',
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name)
  private client: Razorpay | null = null

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('RAZORPAY_KEY_ID')?.trim() &&
        this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim(),
    )
  }

  keyId(): string {
    return this.config.get<string>('RAZORPAY_KEY_ID')?.trim() ?? ''
  }

  private rzp(): Razorpay {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'RAZORPAY_NOT_CONFIGURED',
        message: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in apps/api/.env',
      })
    }
    if (!this.client) {
      this.client = new Razorpay({
        key_id: this.keyId(),
        key_secret: this.config.get<string>('RAZORPAY_KEY_SECRET')!.trim(),
      })
    }
    return this.client
  }

  async getStatus(user: JwtPayload, restaurantId: string) {
    this.tenants.assertAccess(user, restaurantId)
    const r = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!r) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Restaurant not found' })
    return {
      configured: this.isConfigured(),
      keyId: this.isConfigured() ? this.keyId() : null,
      planId: r.planId,
      status: r.status,
      subscriptionStatus: r.subscriptionStatus,
      razorpaySubscriptionId: r.razorpaySubscriptionId,
      razorpayCustomerId: r.razorpayCustomerId,
    }
  }

  /** Start Razorpay subscription checkout for a paid plan. */
  async startSubscription(
    user: JwtPayload,
    input: { restaurantId: string; planId: PlanId },
  ) {
    this.tenants.assertAccess(user, input.restaurantId)
    if (user.role === 'staff') {
      throw new BadRequestException({ code: 'FORBIDDEN', message: 'Staff cannot change billing' })
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
    })
    if (!restaurant) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Restaurant not found' })
    }

    if (input.planId === 'enterprise') {
      throw new BadRequestException({
        code: 'ENTERPRISE_SALES',
        message: 'Enterprise is custom pricing — contact sales',
      })
    }

    // Downgrade / free switch without payment when Razorpay off, or basic from higher.
    if (!this.isConfigured()) {
      await this.prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          planId: input.planId,
          status: 'active',
          subscriptionStatus: 'demo',
        },
      })
      return {
        mode: 'demo' as const,
        planId: input.planId,
        message: 'Razorpay keys missing — plan applied in demo mode',
      }
    }

    const rzpPlanId = await this.ensureRazorpayPlan(input.planId as 'basic' | 'professional')
    const customerId = await this.ensureCustomer(restaurant)

    const subscription = (await this.rzp().subscriptions.create({
      plan_id: rzpPlanId,
      customer_notify: 1,
      total_count: 120,
      notes: {
        restaurantId: restaurant.id,
        planId: input.planId,
        slug: restaurant.slug,
      },
    })) as { id: string; status: string }

    await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        razorpayCustomerId: customerId,
        razorpaySubscriptionId: subscription.id,
        razorpayPlanId: rzpPlanId,
        subscriptionStatus: subscription.status ?? 'created',
      },
    })

    return {
      mode: 'razorpay' as const,
      keyId: this.keyId(),
      subscriptionId: subscription.id,
      planId: input.planId,
      customerId,
    }
  }

  /** After checkout success — sync subscription status from Razorpay. */
  async confirmCheckout(
    user: JwtPayload,
    input: { restaurantId: string; subscriptionId: string; paymentId?: string },
  ) {
    this.tenants.assertAccess(user, input.restaurantId)
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
    })
    if (!restaurant) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Restaurant not found' })
    }
    if (
      restaurant.razorpaySubscriptionId &&
      restaurant.razorpaySubscriptionId !== input.subscriptionId
    ) {
      throw new BadRequestException({ code: 'SUBSCRIPTION_MISMATCH', message: 'Wrong subscription' })
    }

    if (!this.isConfigured()) {
      return this.getStatus(user, input.restaurantId)
    }

    const sub = (await this.rzp().subscriptions.fetch(input.subscriptionId)) as {
      id: string
      status: string
      notes?: { planId?: string }
      plan_id?: string
    }

    const planId = (sub.notes?.planId as PlanId | undefined) ?? restaurant.planId
    const active =
      sub.status === 'active' || sub.status === 'authenticated' || sub.status === 'completed'

    await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        razorpaySubscriptionId: sub.id,
        subscriptionStatus: sub.status,
        ...(active
          ? {
              planId: planId === 'enterprise' ? restaurant.planId : planId,
              status: 'active',
            }
          : {}),
      },
    })

    return this.getStatus(user, input.restaurantId)
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET')?.trim()
    if (!secret || !signature) return false
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    } catch {
      return false
    }
  }

  async handleWebhook(event: string, payload: Record<string, unknown>) {
    const entity =
      ((payload.payload as Record<string, unknown> | undefined)?.subscription as
        | { entity?: Record<string, unknown> }
        | undefined)?.entity ??
      ((payload.payload as Record<string, unknown> | undefined)?.payment as
        | { entity?: Record<string, unknown> }
        | undefined)?.entity

    const subscriptionId =
      (entity?.id as string | undefined) ??
      (entity?.subscription_id as string | undefined) ??
      undefined

    if (!subscriptionId) {
      this.logger.warn(`Webhook ${event} without subscription id`)
      return { ok: true, skipped: true }
    }

    const restaurant = await this.prisma.restaurant.findFirst({
      where: { razorpaySubscriptionId: subscriptionId },
    })
    if (!restaurant) {
      this.logger.warn(`No restaurant for subscription ${subscriptionId}`)
      return { ok: true, skipped: true }
    }

    const notes = (entity?.notes ?? {}) as { planId?: string }
    const status = String(entity?.status ?? '')

    const data: Prisma.RestaurantUpdateInput = {
      subscriptionStatus: status || event,
    }

    if (
      event === 'subscription.activated' ||
      event === 'subscription.charged' ||
      status === 'active' ||
      status === 'authenticated'
    ) {
      if (notes.planId === 'basic' || notes.planId === 'professional') {
        data.planId = notes.planId
      }
      data.status = 'active'
    }

    if (event === 'subscription.pending' || status === 'pending') {
      data.status = 'past_due'
    }

    if (
      event === 'subscription.halted' ||
      event === 'subscription.cancelled' ||
      status === 'halted' ||
      status === 'cancelled'
    ) {
      data.status = status === 'cancelled' ? 'cancelled' : 'suspended'
    }

    await this.prisma.restaurant.update({ where: { id: restaurant.id }, data })
    this.logger.log(`Webhook ${event} applied to ${restaurant.id} → ${status}`)
    return { ok: true }
  }

  /** Mark guest order paid after Razorpay Checkout (public). */
  async markOrderPaid(input: {
    restaurantId: string
    orderId: string
    razorpayOrderId?: string
    razorpayPaymentId?: string
    razorpaySignature?: string
    demo?: boolean
  }) {
    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, restaurantId: input.restaurantId },
    })
    if (!order) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Order not found' })
    }

    if (!input.demo && this.isConfigured()) {
      const secret = this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim()
      if (!secret || !input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
        throw new BadRequestException({ code: 'VALIDATION', message: 'Payment proof required' })
      }
      const expected = createHmac('sha256', secret)
        .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
        .digest('hex')
      try {
        if (!timingSafeEqual(Buffer.from(expected), Buffer.from(input.razorpaySignature))) {
          throw new BadRequestException({ code: 'BAD_SIGNATURE', message: 'Invalid payment signature' })
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e
        throw new BadRequestException({ code: 'BAD_SIGNATURE', message: 'Invalid payment signature' })
      }
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: {
        paid: true,
        paymentMethod: 'online',
        status: order.status === 'pending' ? 'pending' : order.status,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
      },
    })
  }

  /** Create Razorpay order for guest checkout amount (paise). */
  async createPaymentOrder(input: {
    restaurantId: string
    orderId: string
    amountPaise: number
  }) {
    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, restaurantId: input.restaurantId },
    })
    if (!order) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Order not found' })
    }
    const expectedPaise = Math.round(Number(order.total) * 100)
    if (Math.abs(expectedPaise - input.amountPaise) > 1) {
      throw new BadRequestException({ code: 'AMOUNT_MISMATCH', message: 'Amount does not match order' })
    }

    if (!this.isConfigured()) {
      return {
        mode: 'demo' as const,
        keyId: null as string | null,
        razorpayOrderId: `demo_${order.id}`,
        amount: expectedPaise,
        currency: 'INR',
      }
    }

    const rzOrder = (await this.rzp().orders.create({
      amount: expectedPaise,
      currency: 'INR',
      receipt: order.number.slice(0, 40),
      notes: {
        restaurantId: input.restaurantId,
        orderId: order.id,
      },
    })) as { id: string; amount: number; currency: string }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzOrder.id, paymentMethod: 'online' },
    })

    return {
      mode: 'razorpay' as const,
      keyId: this.keyId(),
      razorpayOrderId: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency || 'INR',
    }
  }

  private async ensureCustomer(restaurant: {
    id: string
    razorpayCustomerId: string | null
    ownerEmail: string
    ownerName: string
    phone: string
  }): Promise<string> {
    if (restaurant.razorpayCustomerId) return restaurant.razorpayCustomerId
    const email =
      restaurant.ownerEmail?.trim() ||
      `venue-${restaurant.id}@bear360.app`
    const customer = (await this.rzp().customers.create({
      name: restaurant.ownerName || restaurant.id,
      email,
      contact: restaurant.phone?.replace(/\D/g, '').slice(-10) || undefined,
      notes: { restaurantId: restaurant.id },
    })) as { id: string }
    await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { razorpayCustomerId: customer.id },
    })
    return customer.id
  }

  private async ensureRazorpayPlan(planId: 'basic' | 'professional'): Promise<string> {
    const envKey =
      planId === 'basic' ? 'RAZORPAY_PLAN_BASIC' : 'RAZORPAY_PLAN_PROFESSIONAL'
    const fromEnv = this.config.get<string>(envKey)?.trim()
    if (fromEnv) return fromEnv

    const flagsRow = await this.prisma.platformConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', flags: {} },
      update: {},
    })
    const flags = (flagsRow.flags ?? {}) as Record<string, unknown>
    const map = (flags.razorpayPlanIds ?? {}) as Record<string, string>
    if (map[planId]) return map[planId]

    const created = (await this.rzp().plans.create({
      period: 'monthly',
      interval: 1,
      item: {
        name: PLAN_NAMES[planId],
        amount: PLAN_AMOUNTS_PAISE[planId],
        currency: 'INR',
        description: `${PLAN_NAMES[planId]} monthly`,
      },
    })) as { id: string }

    const nextFlags = {
      ...flags,
      razorpayPlanIds: { ...map, [planId]: created.id },
    }
    await this.prisma.platformConfig.update({
      where: { id: 'default' },
      data: { flags: nextFlags as Prisma.InputJsonValue },
    })
    this.logger.log(`Created Razorpay plan ${planId}=${created.id}`)
    return created.id
  }
}
