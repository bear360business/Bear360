import { ForbiddenException, Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtPayload } from '../auth/jwt-payload'

const CONFIG_ID = 'default'

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  private assertSuper(user: JwtPayload) {
    if (user.role !== 'super') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Super admin only' })
    }
  }

  async getFlags(user: JwtPayload) {
    this.assertSuper(user)
    const row = await this.prisma.platformConfig.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, flags: {} },
      update: {},
    })
    return (row.flags ?? {}) as Record<string, unknown>
  }

  async getPublicUiFlags() {
    const row = await this.prisma.platformConfig.findUnique({ where: { id: CONFIG_ID } })
    const flags = (row?.flags ?? {}) as Record<string, unknown>
    const ui = (flags.platformUi ?? {}) as Record<string, any>
    return {
      service: {
        onlineOrdering: ui.service?.onlineOrdering ?? true,
        kitchenDisplay: ui.service?.kitchenDisplay ?? true,
      },
      customerUi: {
        showItemImages: ui.customerUi?.showItemImages ?? true,
        showVegSpiceBadges: ui.customerUi?.showVegSpiceBadges ?? true,
        showRatings: ui.customerUi?.showRatings ?? true,
        showLiveTracking: ui.customerUi?.showLiveTracking ?? true,
        showPoweredBy: ui.customerUi?.showPoweredBy ?? true,
      },
      adminUi: {
        showReports: ui.adminUi?.showReports ?? true,
        showRevenueStats: ui.adminUi?.showRevenueStats ?? true,
        showActivityFeed: ui.adminUi?.showActivityFeed ?? true,
      },
      menus: ui.menus ?? {},
      customMenus: ui.customMenus ?? [],
      plans: Array.isArray(flags.plans) ? flags.plans : undefined,
    }
  }

  async patchFlags(user: JwtPayload, patch: Record<string, unknown>) {
    this.assertSuper(user)
    const current = await this.getFlags(user)
    const next = { ...current, ...patch }
    const row = await this.prisma.platformConfig.update({
      where: { id: CONFIG_ID },
      data: { flags: next as Prisma.InputJsonValue },
    })
    return (row.flags ?? {}) as Record<string, unknown>
  }

  /** Restaurant-scoped JSON bags under settings.data.* */
  async getVenueBag(user: JwtPayload, restaurantId: string, bag: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) return null
    if (user.role !== 'super' && !user.restaurantIds.includes(restaurantId)) {
      throw new ForbiddenException({ code: 'TENANT_FORBIDDEN', message: 'No access' })
    }
    const settings = (restaurant.settings ?? {}) as Record<string, unknown>
    const data = (settings.data ?? {}) as Record<string, unknown>
    if (data[bag] !== undefined) return data[bag]
    // Object bags vs list bags — payroll/settings must not default to [].
    const objectBags = new Set([
      'payroll',
      'recipes',
      'appearance',
      'navConfig',
      'menuAppearance',
      'qrDesign',
      'finance',
      'venueOps',
      'serviceConfig',
      'staffRoles',
    ])
    return objectBags.has(bag) ? {} : []
  }

  async putVenueBag(user: JwtPayload, restaurantId: string, bag: string, value: unknown) {
    if (user.role !== 'super' && !user.restaurantIds.includes(restaurantId)) {
      throw new ForbiddenException({ code: 'TENANT_FORBIDDEN', message: 'No access' })
    }
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } })
    if (!restaurant) {
      throw new ForbiddenException({ code: 'NOT_FOUND', message: 'Restaurant not found' })
    }
    const settings = (restaurant.settings ?? {}) as Record<string, unknown>
    const data = { ...((settings.data as Record<string, unknown>) ?? {}), [bag]: value }
    const next = { ...settings, data }
    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { settings: next as Prisma.InputJsonValue },
    })
    return value
  }

  /** Public marketing lead — appends to platform flags.leads */
  async appendLead(lead: Record<string, unknown>) {
    const row = await this.prisma.platformConfig.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, flags: { leads: [lead] } as Prisma.InputJsonValue },
      update: {},
    })
    const flags = (row.flags ?? {}) as Record<string, unknown>
    const leads = Array.isArray(flags.leads) ? [...(flags.leads as unknown[])] : []
    leads.unshift(lead)
    const next = { ...flags, leads }
    await this.prisma.platformConfig.update({
      where: { id: CONFIG_ID },
      data: { flags: next as Prisma.InputJsonValue },
    })
    return lead
  }
}
