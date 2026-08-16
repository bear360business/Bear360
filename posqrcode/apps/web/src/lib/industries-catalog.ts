import {
  defaultIndustryProfiles,
  isIndustryId,
  withIndustryIcon,
  type Industry,
  type IndustryId,
  type IndustryLabels,
  type IndustryNavHints,
  type IndustryProfile,
  type IndustryServiceDefaults,
} from './industries'
import type { FeatureKey } from './tenant'
import { FEATURE_META } from './tenant'
import type { OrderType } from './types'

export const INDUSTRIES_STORAGE_KEY = 'bearqr:industries-catalog'

const FEATURE_KEYS = Object.keys(FEATURE_META) as FeatureKey[]

function normalizeLabels(raw: Partial<IndustryLabels> | undefined, fallback: IndustryLabels): IndustryLabels {
  return {
    venue: (raw?.venue ?? fallback.venue).trim() || fallback.venue,
    space: (raw?.space ?? fallback.space).trim() || fallback.space,
    spaces: (raw?.spaces ?? fallback.spaces).trim() || fallback.spaces,
    catalog: (raw?.catalog ?? fallback.catalog).trim() || fallback.catalog,
  }
}

function normalizeService(
  raw: Partial<IndustryServiceDefaults> | undefined,
  fallback: IndustryServiceDefaults,
): IndustryServiceDefaults {
  const orderTypes = {
    ...fallback.orderTypes,
    ...(raw?.orderTypes ?? {}),
  } as Record<OrderType, boolean>
  return {
    orderTypes,
    counterOrdering:
      typeof raw?.counterOrdering === 'boolean' ? raw.counterOrdering : fallback.counterOrdering,
  }
}

function normalizeNavHints(
  raw: Partial<IndustryNavHints> | undefined,
  fallback: IndustryNavHints,
): IndustryNavHints {
  const hide = Array.isArray(raw?.hide)
    ? raw!.hide.filter((p): p is string => typeof p === 'string')
    : fallback.hide
  return { hide: [...hide] }
}

function normalizeFeatureDefaults(
  raw: Partial<Record<FeatureKey, boolean>> | undefined,
  fallback: Partial<Record<FeatureKey, boolean>>,
): Partial<Record<FeatureKey, boolean>> {
  const out: Partial<Record<FeatureKey, boolean>> = { ...fallback }
  if (raw) {
    for (const key of FEATURE_KEYS) {
      if (key in raw) out[key] = Boolean(raw[key])
    }
  }
  return out
}

export function normalizeIndustryProfile(
  raw: Partial<IndustryProfile>,
  fallback?: IndustryProfile,
): IndustryProfile {
  const defaults = defaultIndustryProfiles()
  const base =
    fallback ??
    (isIndustryId(raw.id as string)
      ? defaults.find((d) => d.id === raw.id) ?? defaults[0]
      : defaults[0])

  const id = isIndustryId(raw.id as string) ? (raw.id as IndustryId) : base.id

  return {
    id,
    name: (raw.name ?? base.name).trim() || base.name,
    caption: (raw.caption ?? base.caption).trim() || base.caption,
    featureDefaults: normalizeFeatureDefaults(raw.featureDefaults, base.featureDefaults),
    serviceDefaults: normalizeService(raw.serviceDefaults, base.serviceDefaults),
    labels: normalizeLabels(raw.labels, base.labels),
    navHints: normalizeNavHints(raw.navHints, base.navHints),
  }
}

export function mergeIndustriesCatalog(stored: unknown): IndustryProfile[] {
  const defaults = defaultIndustryProfiles()
  if (!Array.isArray(stored) || stored.length === 0) return defaults

  const byId = new Map<IndustryId, IndustryProfile>()
  for (const d of defaults) byId.set(d.id, d)

  for (const item of stored) {
    const raw = item as Partial<IndustryProfile>
    if (!isIndustryId(raw.id as string)) continue
    const fallback = byId.get(raw.id as IndustryId) ?? defaults[0]
    byId.set(raw.id as IndustryId, normalizeIndustryProfile(raw, fallback))
  }

  // Keep canonical order; include any seed industries missing from storage.
  return defaults.map((d) => byId.get(d.id) ?? d)
}

let catalogCache: IndustryProfile[] = defaultIndustryProfiles()
const listeners = new Set<() => void>()

export function subscribeIndustryCatalog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach((l) => l())
}

/** Keep entitlement / copy resolution in sync with Super → Industries. */
export function syncIndustriesCatalog(profiles: IndustryProfile[]) {
  catalogCache = profiles
  notify()
}

export function getCatalogIndustries(): IndustryProfile[] {
  return catalogCache
}

export function getIndustryProfile(id: IndustryId | string | undefined): IndustryProfile {
  const defaults = defaultIndustryProfiles()
  if (!id || !isIndustryId(id)) return catalogCache[0] ?? defaults[0]
  return catalogCache.find((p) => p.id === id) ?? defaults.find((p) => p.id === id) ?? defaults[0]
}

export function getIndustriesWithIcons(): Industry[] {
  return catalogCache.map(withIndustryIcon)
}

/** Whether industry pack blocks a feature (`false` in featureDefaults). */
export function industryAllowsFeature(
  id: IndustryId | string | undefined,
  feature: FeatureKey,
): boolean {
  const profile = getIndustryProfile(id)
  return profile.featureDefaults[feature] !== false
}
