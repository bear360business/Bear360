import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import * as argon2 from 'argon2'
import type { CreateRestaurantInput, UpdateRestaurantInput } from '@bear360/shared'
import type { PlanId, Prisma, RestaurantStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtPayload } from '../auth/jwt-payload'

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: JwtPayload) {
    if (user.role === 'super') {
      return this.prisma.restaurant.findMany({ orderBy: { name: 'asc' } })
    }
    return this.prisma.restaurant.findMany({
      where: { id: { in: user.restaurantIds } },
      orderBy: { name: 'asc' },
    })
  }

  async getOne(user: JwtPayload, restaurantId: string) {
    this.assertAccess(user, restaurantId)
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Restaurant not found' })
    return restaurant
  }

  async create(user: JwtPayload, input: CreateRestaurantInput) {
    if (user.role !== 'super' && user.role !== 'restaurant') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Cannot create restaurant' })
    }

    const slug = input.slug.trim().toLowerCase()
    const taken = await this.prisma.restaurant.findUnique({ where: { slug } })
    if (taken) {
      throw new ConflictException({ code: 'SLUG_TAKEN', message: 'Store URL already in use' })
    }

    const ownerEmail =
      input.provisionOwnerEmail?.trim().toLowerCase() ||
      input.ownerEmail?.trim().toLowerCase() ||
      user.email?.trim().toLowerCase() ||
      ''

    const org = await this.prisma.organization.create({
      data: { name: `${input.name.trim()} Org` },
    })

    const restaurant = await this.prisma.restaurant.create({
      data: {
        id: slug,
        organizationId: org.id,
        slug,
        name: input.name.trim(),
        phone: input.phone?.trim() || '+91 98765 43210',
        address: input.address,
        city: input.city?.trim() || 'Chennai',
        country: input.country?.trim() || 'IN',
        cuisine: input.cuisine?.trim() || '',
        ownerName: input.ownerName.trim(),
        ownerEmail,
        whatsapp: input.whatsapp,
        mapsLink: input.mapsLink,
        planId: (input.planId ?? 'basic') as PlanId,
        industryId: input.industryId ?? 'restaurants',
        status: 'trial',
        gstRatePct: input.gstRatePct ?? 5,
        gstin: input.gstin,
        currency: input.currency ?? 'INR',
        emoji: input.emoji ?? '🍽️',
        logoImage: input.logoImage,
        coverImage: input.coverImage,
        settings: {
          orderTypes: { 'dine-in': true, takeaway: true, delivery: false },
          counterOrdering: true,
          deliveryFee: 40,
          enabledLocales: ['en', 'ta', 'hi'],
          defaultLocale: 'en',
        },
      },
    })

    // Bind current restaurant-admin user.
    if (user.role === 'restaurant' && !user.sub.startsWith('staff:')) {
      await this.prisma.userRestaurant.create({
        data: { userId: user.sub, restaurantId: restaurant.id },
      })
      await this.prisma.user.update({
        where: { id: user.sub },
        data: { organizationId: org.id },
      })
    }

    // Super can provision an owner account.
    if (user.role === 'super' && ownerEmail) {
      const password = input.provisionOwnerPassword ?? 'demo1234'
      const passwordHash = await argon2.hash(password)
      const owner = await this.prisma.user.upsert({
        where: { email: ownerEmail },
        update: { passwordHash, role: 'restaurant', organizationId: org.id },
        create: {
          email: ownerEmail,
          passwordHash,
          role: 'restaurant',
          organizationId: org.id,
        },
      })
      await this.prisma.userRestaurant.upsert({
        where: {
          userId_restaurantId: { userId: owner.id, restaurantId: restaurant.id },
        },
        update: {},
        create: { userId: owner.id, restaurantId: restaurant.id },
      })
    }

    return restaurant
  }

  async update(user: JwtPayload, restaurantId: string, input: UpdateRestaurantInput) {
    this.assertAccess(user, restaurantId)
    if (user.role === 'staff') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Staff cannot update venue' })
    }

    const data: Prisma.RestaurantUpdateInput = {}
    if (input.name != null) data.name = input.name.trim()
    if (input.slug != null) data.slug = input.slug.trim().toLowerCase()
    if (input.phone != null) data.phone = input.phone
    if (input.address != null) data.address = input.address
    if (input.city != null) data.city = input.city
    if (input.country != null) data.country = input.country
    if (input.cuisine != null) data.cuisine = input.cuisine
    if (input.ownerName != null) data.ownerName = input.ownerName
    if (input.ownerEmail != null) data.ownerEmail = input.ownerEmail
    if (input.whatsapp != null) data.whatsapp = input.whatsapp
    if (input.mapsLink != null) data.mapsLink = input.mapsLink
    if (input.planId != null) data.planId = input.planId as PlanId
    if (input.industryId != null) data.industryId = input.industryId
    if (input.status != null) data.status = input.status as RestaurantStatus
    if (input.gstRatePct != null) data.gstRatePct = input.gstRatePct
    if (input.gstin != null) data.gstin = input.gstin
    if (input.currency != null) data.currency = input.currency
    if (input.emoji != null) data.emoji = input.emoji
    if (input.logoImage != null) data.logoImage = input.logoImage
    if (input.coverImage != null) data.coverImage = input.coverImage
    if (input.isOpen != null) data.isOpen = input.isOpen
    if (input.opensAt != null) data.opensAt = input.opensAt
    if (input.closesAt != null) data.closesAt = input.closesAt
    if (input.settings != null) {
      const current = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } })
      const prev = (current?.settings ?? {}) as Record<string, unknown>
      data.settings = { ...prev, ...input.settings } as Prisma.InputJsonValue
    }

    try {
      return await this.prisma.restaurant.update({ where: { id: restaurantId }, data })
    } catch {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Restaurant not found' })
    }
  }

  async remove(user: JwtPayload, restaurantId: string) {
    if (user.role !== 'super') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Super admin only' })
    }
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Restaurant not found' })
    }

    const organizationId = restaurant.organizationId
    await this.prisma.restaurant.delete({ where: { id: restaurantId } })

    const remaining = await this.prisma.restaurant.count({ where: { organizationId } })
    if (remaining === 0) {
      await this.prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined)
    }

    return { ok: true as const, id: restaurantId }
  }

  assertAccess(user: JwtPayload, restaurantId: string) {
    if (user.role === 'super') return
    if (user.role === 'restaurant' || user.role === 'kitchen') {
      if (user.restaurantIds.length === 0 || user.restaurantIds.includes(restaurantId)) return
    }
    if (user.restaurantIds.includes(restaurantId)) return
    throw new ForbiddenException({ code: 'TENANT_FORBIDDEN', message: 'No access to this restaurant' })
  }
}
