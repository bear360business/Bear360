// Tenant entitlement model — the single source of truth for "what can this
// venue see?" (BEARQR_SAAS_UI_ARCHITECTURE.md §0.3, §4, §5).
//
// effective(feature) =
//   planGrants[feature]
//   && industryDefaults[feature] !== false
//   && platformGrants[feature] !== false
//   && superOverride[feature] !== false
//
// UI never asks "which plan is this" — it asks useFeature('inventory').

import { readSuperSettings } from './super-settings'

export type PlanId = 'basic' | 'professional' | 'enterprise'

export type FeatureKey =
  | 'qrOrdering'
  | 'pos'
  | 'kitchen'
  | 'tables'
  | 'inventory'
  | 'staff'
  | 'scheduler'
  | 'payroll'
  | 'reportsBasic'
  | 'reportsAdvanced'
  | 'reportsCustom'
  | 'ai'
  | 'multiBranch'
  | 'export'

export type LimitKey = 'tables' | 'menuItems' | 'ordersPerMonth' | 'staffSeats' | 'branches'

export type TenantStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'expired'

/** Ordered cheapest → richest; used for "which plan unlocks this" lookups. */
export const PLAN_ORDER: PlanId[] = ['basic', 'professional', 'enterprise']

export interface PlanMeta {
  id: PlanId
  name: string
  /** 3-letter form for tight chips (rail footer, nav locks). */
  short: string
  priceMonthly: number | null
  priceLabel: string
  tagline: string
  popular?: boolean
}

export const PLAN_META: Record<PlanId, PlanMeta> = {
  basic: {
    id: 'basic',
    name: 'Basic',
    short: 'BASIC',
    priceMonthly: 999,
    priceLabel: '₹999',
    tagline: 'Single counter, QR-first',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    short: 'PRO',
    priceMonthly: 2499,
    priceLabel: '₹2,499',
    tagline: 'Full-service restaurant',
    popular: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    short: 'ENT',
    priceMonthly: null,
    priceLabel: 'Custom',
    tagline: 'Groups & multi-branch',
  },
}

export const PLAN_FEATURES: Record<PlanId, Record<FeatureKey, boolean>> = {
  basic: {
    qrOrdering: true,
    pos: false,
    kitchen: false,
    tables: true,
    inventory: false,
    staff: false,
    scheduler: false,
    payroll: false,
    reportsBasic: true,
    reportsAdvanced: false,
    reportsCustom: false,
    ai: false,
    multiBranch: false,
    export: false,
  },
  professional: {
    qrOrdering: true,
    pos: true,
    kitchen: true,
    tables: true,
    inventory: true,
    staff: true,
    scheduler: true,
    payroll: true,
    reportsBasic: true,
    reportsAdvanced: true,
    reportsCustom: false,
    ai: false,
    multiBranch: false,
    export: true,
  },
  enterprise: {
    qrOrdering: true,
    pos: true,
    kitchen: true,
    tables: true,
    inventory: true,
    staff: true,
    scheduler: true,
    payroll: true,
    reportsBasic: true,
    reportsAdvanced: true,
    reportsCustom: true,
    ai: true,
    multiBranch: true,
    export: true,
  },
}

/** `null` = unlimited. */
export const PLAN_LIMITS: Record<PlanId, Record<LimitKey, number | null>> = {
  basic: { tables: 10, menuItems: 50, ordersPerMonth: 1000, staffSeats: 2, branches: 1 },
  professional: {
    tables: null,
    menuItems: null,
    ordersPerMonth: null,
    staffSeats: 5,
    branches: 1,
  },
  enterprise: {
    tables: null,
    menuItems: null,
    ordersPerMonth: null,
    staffSeats: null,
    branches: null,
  },
}

export interface FeatureMeta {
  key: FeatureKey
  label: string
  /** Sales copy for the upgrade drawer / upgrade page. */
  pitch: string
  benefits: string[]
}

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
  qrOrdering: {
    key: 'qrOrdering',
    label: 'QR Ordering',
    pitch: 'Let guests scan, browse and order without an app or a waiter.',
    benefits: ['Table & counter QR codes', 'Live order tracking', 'GST-compliant bills'],
  },
  pos: {
    key: 'pos',
    label: 'POS',
    pitch: 'Bill at the counter in seconds — cash, UPI, card or split.',
    benefits: ['Fast item grid', 'Split payments', 'Prints & shares receipts'],
  },
  kitchen: {
    key: 'kitchen',
    label: 'Kitchen display',
    pitch: 'Replace paper tickets with a live kitchen screen.',
    benefits: ['New / Preparing / Ready columns', 'Colour-coded timers', 'Touch-friendly'],
  },
  tables: {
    key: 'tables',
    label: 'Tables / spaces',
    pitch: 'Floor map, QR per table or room, and reservations.',
    benefits: ['Live floor status', 'Per-space QR codes', 'Reservation book'],
  },
  inventory: {
    key: 'inventory',
    label: 'Inventory',
    pitch: 'Track stock automatically as orders are billed.',
    benefits: [
      'Auto-deduct from every sale',
      'Low-stock alerts before you run out',
      'Wastage log & supplier costs',
    ],
  },
  staff: {
    key: 'staff',
    label: 'Staff management',
    pitch: 'Your team, their roles, their hours — in one place.',
    benefits: ['Roles & permissions', 'Attendance tracking', 'Payroll summary'],
  },
  scheduler: {
    key: 'scheduler',
    label: 'Shift scheduler',
    pitch: 'Plan the week against your forecast peaks.',
    benefits: ['Drag-and-drop shifts', 'Coverage vs forecast', 'Publish & notify'],
  },
  payroll: {
    key: 'payroll',
    label: 'Payroll summary',
    pitch: 'Hours, overtime and net pay per period, ready to export.',
    benefits: ['Per-employee breakdown', 'Overtime tracking', 'CSV export'],
  },
  reportsBasic: {
    key: 'reportsBasic',
    label: 'Sales reports',
    pitch: 'Know what sold, when, and through which channel.',
    benefits: ['Revenue & AOV', 'Top items', 'Peak hours'],
  },
  reportsAdvanced: {
    key: 'reportsAdvanced',
    label: 'Profit & labour reports',
    pitch: 'See what you actually keep after food and labour cost.',
    benefits: ['Gross margin waterfall', 'Labour cost %', 'Inventory cost variance'],
  },
  reportsCustom: {
    key: 'reportsCustom',
    label: 'Custom reports',
    pitch: 'Build and schedule the reports your group needs.',
    benefits: ['Dimension & measure picker', 'Saved reports', 'Scheduled email delivery'],
  },
  ai: {
    key: 'ai',
    label: 'AI insights',
    pitch: 'A manager that watches your numbers around the clock.',
    benefits: [
      'Stock-out predictions',
      'Menu & pricing opportunities',
      'Staffing recommendations',
    ],
  },
  multiBranch: {
    key: 'multiBranch',
    label: 'Multi-branch',
    pitch: 'Run every outlet from one account.',
    benefits: ['Branch switcher', 'Consolidated reporting', 'Per-branch menus'],
  },
  export: {
    key: 'export',
    label: 'Data export',
    pitch: 'Take your numbers into Excel or your accountant’s tools.',
    benefits: ['CSV & PDF export', 'Scheduled exports', 'Full history'],
  },
}

/**
 * Live entitlements from Super → Plans (localStorage). Null = use the
 * hardcoded PLAN_FEATURES / PLAN_LIMITS defaults.
 */
let liveFeatures: Record<PlanId, Record<FeatureKey, boolean>> | null = null
let liveLimits: Record<PlanId, Record<LimitKey, number | null>> | null = null

/** Called by the plans catalog whenever a tier is edited. */
export function setLivePlanEntitlements(
  features: Partial<Record<PlanId, Record<FeatureKey, boolean>>>,
  limits: Partial<Record<PlanId, Record<LimitKey, number | null>>>,
) {
  liveFeatures = { ...PLAN_FEATURES, ...features }
  liveLimits = { ...PLAN_LIMITS, ...limits }
}

function featuresFor(planId: PlanId): Record<FeatureKey, boolean> {
  return (liveFeatures ?? PLAN_FEATURES)[planId] ?? PLAN_FEATURES.basic
}

function limitsFor(planId: PlanId): Record<LimitKey, number | null> {
  return (liveLimits ?? PLAN_LIMITS)[planId] ?? PLAN_LIMITS.basic
}

/** Cheapest plan that grants a feature (drives "Upgrade to X" copy). */
export function planFor(feature: FeatureKey): PlanId {
  return PLAN_ORDER.find((p) => featuresFor(p)[feature]) ?? 'enterprise'
}

export const LIMIT_META: Record<LimitKey, { label: string; unit: string }> = {
  tables: { label: 'Tables', unit: 'tables' },
  menuItems: { label: 'Menu items', unit: 'items' },
  ordersPerMonth: { label: 'Orders this month', unit: 'orders' },
  staffSeats: { label: 'Staff seats', unit: 'seats' },
  branches: { label: 'Branches', unit: 'branches' },
}

// ---------------------------------------------------------------------------
// Stored config (what the super admin / owner can change from the UI)
// ---------------------------------------------------------------------------

export interface TenantConfig {
  planId: PlanId
  status: TenantStatus
  /** ISO date the current term renews / ends. */
  renewsOn: string
  /** Days left when status === 'trial'. */
  trialDaysLeft: number
  /**
   * Super-admin kill switches. A key present and false hides the feature
   * entirely (not "locked") — see §5.1. Absent = no override.
   */
  overrides: Partial<Record<FeatureKey, boolean>>
  /** Current usage against PLAN_LIMITS. */
  usage: Record<LimitKey, number>
}

export function calculateTrialState(
  createdAt?: string,
  durationDays = 7,
): { trialDaysLeft: number; renewsOn: string } {
  const start = createdAt ? new Date(createdAt) : new Date()
  const validStart = isNaN(start.getTime()) ? new Date() : start
  const expiresAt = new Date(validStart.getTime() + durationDays * 24 * 60 * 60 * 1000)
  const now = new Date()
  const msLeft = expiresAt.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  const renewsOn = expiresAt.toISOString().slice(0, 10)
  return { trialDaysLeft: Math.min(daysLeft, durationDays), renewsOn }
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  planId: 'professional',
  status: 'trial',
  renewsOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  trialDaysLeft: 7,
  overrides: {},
  usage: { tables: 0, menuItems: 0, ordersPerMonth: 0, staffSeats: 0, branches: 1 },
}

export const TENANT_STORAGE_KEY = 'bearqr:tenant'

export function mergeTenantConfig(stored: unknown): TenantConfig {
  const s = (stored ?? {}) as Partial<TenantConfig>
  return {
    planId: PLAN_ORDER.includes(s.planId as PlanId)
      ? (s.planId as PlanId)
      : DEFAULT_TENANT_CONFIG.planId,
    status: (
      ['trial', 'active', 'past_due', 'suspended', 'expired'] as TenantStatus[]
    ).includes(s.status as TenantStatus)
      ? (s.status as TenantStatus)
      : DEFAULT_TENANT_CONFIG.status,
    renewsOn: typeof s.renewsOn === 'string' ? s.renewsOn : DEFAULT_TENANT_CONFIG.renewsOn,
    trialDaysLeft:
      typeof s.trialDaysLeft === 'number'
        ? s.trialDaysLeft
        : DEFAULT_TENANT_CONFIG.trialDaysLeft,
    overrides: typeof s.overrides === 'object' && s.overrides ? s.overrides : {},
    usage: { ...DEFAULT_TENANT_CONFIG.usage, ...s.usage },
  }
}

/**
 * Effective grants: plan ∧ industry ∧ platform ∧ super override.
 * Industry / platform layers omit a key to mean "allow" (`!== false`).
 */
const ALL_TRIAL_FEATURES: Record<FeatureKey, boolean> = {
  qrOrdering: true,
  pos: true,
  kitchen: true,
  tables: true,
  inventory: true,
  staff: true,
  scheduler: true,
  payroll: true,
  reportsBasic: true,
  reportsAdvanced: true,
  reportsCustom: true,
  ai: true,
  multiBranch: true,
  export: true,
}

export function resolveFeatures(
  config: TenantConfig,
  industryGrants: Partial<Record<FeatureKey, boolean>> = {},
  platformGrants: Partial<Record<FeatureKey, boolean>> = {},
): Record<FeatureKey, boolean> {
  const isTrial = config.status === 'trial'
  const superSettings = readSuperSettings()
  const trialPolicy = superSettings.freeTrialPolicy
  const granted = isTrial
    ? trialPolicy?.accessLevel === 'custom' && trialPolicy.trialFeatures
      ? trialPolicy.trialFeatures
      : ALL_TRIAL_FEATURES
    : featuresFor(config.planId)

  const out = {} as Record<FeatureKey, boolean>
  for (const key of Object.keys(FEATURE_META) as FeatureKey[]) {
    const hasOverride = !isTrial && config.overrides[key] !== undefined
    const baseFeature = hasOverride ? Boolean(config.overrides[key]) : Boolean(granted[key] ?? true)
    out[key] =
      baseFeature &&
      industryGrants[key] !== false &&
      platformGrants[key] !== false
  }
  return out
}

export interface LimitState {
  used: number
  max: number | null
  /** 0–1; 0 when unlimited. */
  ratio: number
  state: 'ok' | 'warn' | 'full' | 'over'
}

export function resolveLimit(config: TenantConfig, key: LimitKey): LimitState {
  const used = config.usage[key] ?? 0
  const max = config.status === 'trial' ? null : limitsFor(config.planId)[key]
  if (max === null) return { used, max: null, ratio: 0, state: 'ok' }
  const ratio = max === 0 ? 1 : used / max
  const state = used > max ? 'over' : used === max ? 'full' : ratio >= 0.8 ? 'warn' : 'ok'
  return { used, max, ratio: Math.min(ratio, 1), state }
}

/** Suspended / expired tenants keep their data but lose every write. */
export function isReadOnly(status: TenantStatus): boolean {
  return status === 'suspended' || status === 'expired'
}
