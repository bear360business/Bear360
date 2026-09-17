import type { Plan } from './types'
import {
  FEATURE_META,
  LIMIT_META,
  PLAN_FEATURES,
  PLAN_LIMITS,
  PLAN_META,
  PLAN_ORDER,
  setLivePlanEntitlements,
  type FeatureKey,
  type LimitKey,
  type PlanId,
} from './tenant'

export const PLANS_STORAGE_KEY = 'bearqr:plans-catalog'

export const FEATURE_KEYS = Object.keys(FEATURE_META) as FeatureKey[]
export const LIMIT_KEYS = Object.keys(LIMIT_META) as LimitKey[]

/** Super-admin managed subscription tier (doc §6.5 + S8 matrix). */
export interface ManagedPlan {
  id: string
  name: string
  priceMonthly: number | null
  priceLabel: string
  /** Marketing bullets on the plan card. */
  features: string[]
  restaurantCount: number
  popular?: boolean
  dark?: boolean
  archived?: boolean
  tagline?: string
  featureGrants: Record<FeatureKey, boolean>
  limits: Record<LimitKey, number | null>
}

export function formatPriceLabel(priceMonthly: number | null): string {
  if (priceMonthly === null || Number.isNaN(priceMonthly)) return 'Custom'
  return `₹${priceMonthly.toLocaleString('en-IN')}`
}

function seedFromCanonical(id: PlanId, extras: Partial<ManagedPlan>): ManagedPlan {
  const meta = PLAN_META[id]
  return {
    id,
    name: extras.name ?? meta.name,
    priceMonthly: meta.priceMonthly,
    priceLabel: meta.priceLabel,
    features: extras.features ?? [],
    restaurantCount: extras.restaurantCount ?? 0,
    popular: extras.popular ?? meta.popular,
    dark: extras.dark,
    tagline: extras.tagline ?? meta.tagline,
    featureGrants: { ...PLAN_FEATURES[id] },
    limits: { ...PLAN_LIMITS[id] },
  }
}

/** Default catalogue — matches the mock cards + entitlement matrices. */
export function defaultPlansCatalog(): ManagedPlan[] {
  return [
    seedFromCanonical('basic', {
      name: 'Starter',
      features: ['10 tables', '50 menu items', 'Basic reports'],
      restaurantCount: 42,
      tagline: 'Single counter, QR-first',
    }),
    seedFromCanonical('professional', {
      name: 'Pro',
      features: ['Unlimited tables', 'Kitchen display', 'Full reports'],
      restaurantCount: 71,
      popular: true,
      tagline: 'Full-service restaurant',
    }),
    seedFromCanonical('enterprise', {
      name: 'Enterprise',
      features: ['Multi-branch', 'SLA support', 'Custom domain'],
      restaurantCount: 15,
      dark: true,
      tagline: 'Groups & multi-branch',
    }),
  ]
}

function isPlanId(id: string): id is PlanId {
  return (PLAN_ORDER as string[]).includes(id)
}

function normalizePlan(raw: Partial<ManagedPlan>, fallback?: ManagedPlan): ManagedPlan {
  const base = fallback ?? defaultPlansCatalog()[0]
  const id = typeof raw.id === 'string' && raw.id ? raw.id : base.id
  const grantsBase = isPlanId(id) ? PLAN_FEATURES[id] : PLAN_FEATURES.professional
  const limitsBase = isPlanId(id) ? PLAN_LIMITS[id] : PLAN_LIMITS.professional
  const priceMonthly =
    raw.priceMonthly === null
      ? null
      : typeof raw.priceMonthly === 'number'
        ? raw.priceMonthly
        : base.priceMonthly

  const featureGrants = { ...grantsBase, ...raw.featureGrants }
  for (const key of FEATURE_KEYS) {
    featureGrants[key] = Boolean(featureGrants[key])
  }

  const limits = { ...limitsBase, ...raw.limits } as Record<LimitKey, number | null>
  for (const key of LIMIT_KEYS) {
    const v = limits[key]
    limits[key] = v === null || v === undefined ? null : Math.max(0, Number(v) || 0)
  }

  return {
    id,
    name: (raw.name ?? base.name).trim() || 'Untitled plan',
    priceMonthly,
    priceLabel: formatPriceLabel(priceMonthly),
    features: Array.isArray(raw.features)
      ? raw.features.map((f) => String(f).trim()).filter(Boolean)
      : base.features,
    restaurantCount:
      typeof raw.restaurantCount === 'number' ? raw.restaurantCount : base.restaurantCount,
    popular: Boolean(raw.popular),
    dark: Boolean(raw.dark),
    archived: Boolean(raw.archived),
    tagline: raw.tagline ?? base.tagline,
    featureGrants,
    limits,
  }
}

export function mergePlansCatalog(stored: unknown): ManagedPlan[] {
  const defaults = defaultPlansCatalog()
  if (!Array.isArray(stored) || stored.length === 0) return defaults
  return stored.map((item, i) =>
    normalizePlan(item as Partial<ManagedPlan>, defaults[i] ?? defaults[0]),
  )
}

/** Display shape used by older screens (restaurants table, billing chips). */
export function toDisplayPlan(plan: ManagedPlan): Plan {
  return {
    id: (isPlanId(plan.id) ? plan.id : 'professional') as PlanId,
    name: plan.name,
    priceMonthly: plan.priceMonthly,
    priceLabel: plan.priceLabel,
    features: plan.features,
    restaurantCount: plan.restaurantCount,
    popular: plan.popular,
    dark: plan.dark,
  }
}

let catalogCache: ManagedPlan[] = defaultPlansCatalog()

export function getCatalogPlans(): ManagedPlan[] {
  return catalogCache
}

export function getActiveCatalogPlans(): ManagedPlan[] {
  return catalogCache.filter((p) => !p.archived)
}

export function getCatalogPlanById(id: string): ManagedPlan | undefined {
  return catalogCache.find((p) => p.id === id)
}

/** Keep entitlement resolution + legacy `plans` mock in sync. */
export function syncPlansCatalog(plans: ManagedPlan[]) {
  catalogCache = plans
  const features: Partial<Record<PlanId, Record<FeatureKey, boolean>>> = {}
  const limits: Partial<Record<PlanId, Record<LimitKey, number | null>>> = {}
  for (const p of plans) {
    if (isPlanId(p.id)) {
      features[p.id] = p.featureGrants
      limits[p.id] = p.limits
      if (PLAN_META[p.id]) {
        PLAN_META[p.id].name = p.name
        PLAN_META[p.id].priceMonthly = p.priceMonthly
        PLAN_META[p.id].priceLabel = p.priceLabel
        if (p.tagline) PLAN_META[p.id].tagline = p.tagline
        if (p.popular !== undefined) PLAN_META[p.id].popular = p.popular
      }
    }
  }
  setLivePlanEntitlements(features, limits)
}

export function blankPlanDraft(): ManagedPlan {
  return normalizePlan({
    id: `plan-${Date.now().toString(36)}`,
    name: 'New plan',
    priceMonthly: 1499,
    features: ['QR ordering', 'POS billing', 'Kitchen display'],
    restaurantCount: 0,
    tagline: 'Custom tier',
    featureGrants: { ...PLAN_FEATURES.professional },
    limits: { ...PLAN_LIMITS.professional },
  })
}
