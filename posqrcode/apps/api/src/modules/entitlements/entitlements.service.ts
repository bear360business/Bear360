import { Injectable } from '@nestjs/common'
import type { Entitlements, FeatureKey, PlanId } from '@bear360/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { TenantsService } from '../tenants/tenants.service'
import type { JwtPayload } from '../auth/jwt-payload'

const PLAN_FEATURES: Record<PlanId, Record<FeatureKey, boolean>> = {
  basic: {
    tables: true,
    qrOrdering: true,
    pos: false,
    kitchen: false,
    inventory: false,
    staff: false,
    reports: false,
    ai: false,
    multiBranch: false,
  },
  professional: {
    tables: true,
    qrOrdering: true,
    pos: true,
    kitchen: true,
    inventory: true,
    staff: true,
    reports: true,
    ai: false,
    multiBranch: false,
  },
  enterprise: {
    tables: true,
    qrOrdering: true,
    pos: true,
    kitchen: true,
    inventory: true,
    staff: true,
    reports: true,
    ai: true,
    multiBranch: true,
  },
}

const PLAN_LIMITS: Record<PlanId, Entitlements['limits']> = {
  basic: { tables: 15, menuItems: 50, staffSeats: 3, branches: 1 },
  professional: { tables: 60, menuItems: 200, staffSeats: 25, branches: 1 },
  enterprise: { tables: 500, menuItems: 2000, staffSeats: 200, branches: 20 },
}

const INDUSTRY_BLOCKS: Record<string, Partial<Record<FeatureKey, boolean>>> = {
  'cloud-kitchens': { tables: false },
  catering: { tables: false },
  bakeries: { tables: false },
  nutrition: { tables: false, kitchen: false },
  'food-trucks': { tables: false },
}

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  async forRestaurant(user: JwtPayload, restaurantId: string): Promise<Entitlements> {
    const restaurant = await this.tenants.getOne(user, restaurantId)
    const planId = restaurant.planId as PlanId
    const platform = await this.prisma.platformConfig.findUnique({ where: { id: 'default' } })
    const platformFlags = (platform?.flags ?? {}) as Record<string, unknown>

    const isTrial = restaurant.status === 'trial'
    let features = isTrial ? { ...PLAN_FEATURES.enterprise } : { ...PLAN_FEATURES[planId] }
    let limits = isTrial ? { ...PLAN_LIMITS.enterprise } : { ...PLAN_LIMITS[planId] }

    const plans = platformFlags.plans
    if (Array.isArray(plans)) {
      const managed = plans.find(
        (p) => p && typeof p === 'object' && (p as { id?: string }).id === planId,
      ) as
        | {
            featureGrants?: Record<FeatureKey, boolean>
            limits?: Entitlements['limits']
          }
        | undefined
      if (managed?.featureGrants) features = { ...features, ...managed.featureGrants }
      if (managed?.limits) limits = { ...limits, ...managed.limits }
    }

    const industryBlocks = INDUSTRY_BLOCKS[restaurant.industryId] ?? {}
    for (const [key, allowed] of Object.entries(industryBlocks)) {
      if (allowed === false) features[key as FeatureKey] = false
    }

    const featureOverrides = platformFlags.featureOverrides as
      | Partial<Record<FeatureKey, boolean>>
      | undefined
    if (featureOverrides) {
      for (const [key, allowed] of Object.entries(featureOverrides)) {
        if (typeof allowed === 'boolean') {
          features[key as FeatureKey] = allowed && features[key as FeatureKey]
        }
      }
    }

    return {
      restaurantId: restaurant.id,
      planId,
      industryId: restaurant.industryId,
      features,
      limits,
      status: restaurant.status as Entitlements['status'],
    }
  }
}
