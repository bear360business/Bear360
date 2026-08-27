import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { usePlans } from '@/hooks/use-plans'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import {
  getVenueIndustryEpoch,
  notifyVenueIndustryChanged,
  subscribeVenueIndustry,
} from '@/hooks/use-industry-copy'
import { apiGetEntitlements } from '@/lib/api-entitlements'
import { getAccessToken } from '@/lib/api-client'
import { CURRENT_VENUE_EVENT, getCurrentRestaurant, getCurrentRestaurantId } from '@/lib/mock'
import { getIndustryProfile, subscribeIndustryCatalog } from '@/lib/industries-catalog'
import { useMockData } from '@/lib/runtime-config'
import { restaurantStatusToTenant } from '@/lib/venue-entitlements'
import {
  DEFAULT_TENANT_CONFIG,
  TENANT_STORAGE_KEY,
  isReadOnly,
  mergeTenantConfig,
  resolveFeatures,
  resolveLimit,
  type FeatureKey,
  type LimitKey,
  type LimitState,
  type PlanId,
  type TenantConfig,
  type TenantStatus,
} from '@/lib/tenant'
import { isStoreSetupPending } from '@/features/admin/onboarding/store-setup'
import { reportApiError } from '@/lib/api-error'

const RESTAURANTS_STORAGE_KEY = 'bearqr:restaurants'

// Re-export so Settings / create wizard can ping entitlement after industry change.
export { notifyVenueIndustryChanged }

interface TenantContextValue {
  config: TenantConfig
  /** Effective grants — plan ∧ industry ∧ platform ∧ super override. */
  features: Record<FeatureKey, boolean>
  /** True when the tenant may not write (suspended / expired). */
  readOnly: boolean
  limit: (key: LimitKey) => LimitState
  setPlan: (plan: PlanId) => void
  setStatus: (status: TenantStatus) => void
  setOverride: (feature: FeatureKey, enabled: boolean | null) => void
  reset: () => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

function readStored(): TenantConfig {
  try {
    const raw = localStorage.getItem(TENANT_STORAGE_KEY)
    return raw ? mergeTenantConfig(JSON.parse(raw)) : DEFAULT_TENANT_CONFIG
  } catch {
    return DEFAULT_TENANT_CONFIG
  }
}

function writeStored(config: TenantConfig): void {
  try {
    localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // storage unavailable — entitlements just won't persist
  }
}

/**
 * One tenant, one entitlement resolution, shared by every admin/staff screen
 * (BEARQR_SAAS_UI_ARCHITECTURE.md §0.3). Cross-tab sync means a super admin
 * changing a plan updates an open restaurant tab immediately.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(() => readStored())
  const [venueTick, setVenueTick] = useState(0)
  const mock = useMockData()
  // Re-resolve grants when Super → Plans edits the matrix (same tab).
  const { plans: planCatalog } = usePlans()
  const { config: platform } = usePlatformConfig()
  // Re-resolve when venue industry or Super → Industries catalog changes.
  useSyncExternalStore(subscribeVenueIndustry, getVenueIndustryEpoch, getVenueIndustryEpoch)
  useSyncExternalStore(subscribeIndustryCatalog, () => getIndustryProfile('restaurants').name, () => '')

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TENANT_STORAGE_KEY || e.key === null) setConfig(readStored())
      if (e.key === RESTAURANTS_STORAGE_KEY || e.key === null) setVenueTick((n) => n + 1)
    }
    const onResync = () => {
      setConfig(readStored())
      setVenueTick((n) => n + 1)
    }
    const onVenue = () => setVenueTick((n) => n + 1)
    window.addEventListener('storage', onStorage)
    window.addEventListener('bearqr:tenant-resync', onResync)
    window.addEventListener(CURRENT_VENUE_EVENT, onVenue)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('bearqr:tenant-resync', onResync)
      window.removeEventListener(CURRENT_VENUE_EVENT, onVenue)
    }
  }, [])

  useEffect(() => {
    if (mock || isStoreSetupPending()) return
    let cancelled = false
    const hydrate = () => {
      if (!getAccessToken() || isStoreSetupPending()) return
      const restaurantId = getCurrentRestaurantId()
      if (!restaurantId) return
      void apiGetEntitlements(restaurantId)
        .then((ent) => {
          if (cancelled) return
          const status: TenantStatus =
            ent.status === 'cancelled' ? 'expired' : (ent.status as TenantStatus)
          const overrides: Partial<Record<FeatureKey, boolean>> = {}
          const f = ent.features
          if (f.tables === false) overrides.tables = false
          if (f.qrOrdering === false) overrides.qrOrdering = false
          if (f.pos === false) overrides.pos = false
          if (f.kitchen === false) overrides.kitchen = false
          if (f.inventory === false) overrides.inventory = false
          if (f.staff === false) overrides.staff = false
          if (f.ai === false) overrides.ai = false
          if (f.multiBranch === false) overrides.multiBranch = false
          if (f.reports === false) {
            overrides.reportsBasic = false
            overrides.reportsAdvanced = false
            overrides.reportsCustom = false
          }
          setConfig((prev) => {
            const next = mergeTenantConfig({
              ...prev,
              planId: ent.planId as PlanId,
              status,
              overrides: { ...prev.overrides, ...overrides },
            })
            writeStored(next)
            return next
          })
        })
        .catch((err) => {
          if (getAccessToken()) reportApiError(err, 'Could not load plan entitlements')
        })
    }
    hydrate()
    window.addEventListener('bearqr:auth-changed', hydrate)
    return () => {
      cancelled = true
      window.removeEventListener('bearqr:auth-changed', hydrate)
    }
  }, [mock, venueTick])

  const update = useCallback((patch: Partial<TenantConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      writeStored(next)
      return next
    })
  }, [])

  const setPlan = useCallback(
    (planId: PlanId) => {
      update({ planId })
      if (!mock) {
        const venueId = getCurrentRestaurantId()
        void import('@/lib/api-tenants')
          .then(({ apiUpdateTenant }) => apiUpdateTenant(venueId, { planId }))
          .catch((err) => reportApiError(err))
      }
      // Dual-write: restaurant row stays the catalog source of truth for Super.
      try {
        const venueId = getCurrentRestaurantId()
        const raw = localStorage.getItem(RESTAURANTS_STORAGE_KEY)
        if (!raw) return
        const list = JSON.parse(raw) as Array<{ id: string; slug: string; planId: string; mrr?: number }>
        const next = list.map((r) =>
          r.id === venueId || r.slug === venueId ? { ...r, planId } : r,
        )
        localStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(
          new StorageEvent('storage', { key: RESTAURANTS_STORAGE_KEY }),
        )
      } catch {
        /* ignore */
      }
    },
    [update, mock],
  )
  const setStatus = useCallback(
    (status: TenantStatus) => {
      update({ status })
      // Dual-write status onto the active venue row.
      try {
        const venueId = getCurrentRestaurantId()
        const raw = localStorage.getItem(RESTAURANTS_STORAGE_KEY)
        if (!raw) return
        const list = JSON.parse(raw) as Array<Record<string, unknown>>
        const restaurantStatus =
          status === 'trial'
            ? 'trial'
            : status === 'suspended'
              ? 'suspended'
              : status === 'expired'
                ? 'expired'
                : 'active'
        const next = list.map((r) => {
          if (r.id !== venueId && r.slug !== venueId) return r
          if (restaurantStatus === 'suspended' && r.status !== 'suspended') {
            return { ...r, status: restaurantStatus, statusBeforeSuspend: r.status }
          }
          if (restaurantStatus !== 'suspended' && r.status === 'suspended') {
            return {
              ...r,
              status: (r.statusBeforeSuspend as string) ?? restaurantStatus,
              statusBeforeSuspend: undefined,
            }
          }
          return { ...r, status: restaurantStatus }
        })
        localStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(
          new StorageEvent('storage', { key: RESTAURANTS_STORAGE_KEY }),
        )
      } catch {
        /* ignore */
      }
    },
    [update],
  )

  const setOverride = useCallback(
    (feature: FeatureKey, enabled: boolean | null) => {
      setConfig((prev) => {
        const overrides = { ...prev.overrides }
        if (enabled === null) delete overrides[feature]
        else overrides[feature] = enabled
        const next = { ...prev, overrides }
        writeStored(next)
        return next
      })
    },
    [],
  )

  const reset = useCallback(() => {
    writeStored(DEFAULT_TENANT_CONFIG)
    setConfig(DEFAULT_TENANT_CONFIG)
  }, [])

  // Venue row is source of truth for plan/status when Super mutates tenants.
  const venue = getCurrentRestaurant()
  const industryId = venue.industryId
  const industryProfile = getIndustryProfile(industryId)
  const effectiveConfig = useMemo<TenantConfig>(
    () =>
      mergeTenantConfig({
        ...config,
        planId: venue.planId ?? config.planId,
        status: restaurantStatusToTenant(venue.status),
      }),
    // venueTick: Super restaurant mutations / venue switch
    // eslint-disable-next-line react-hooks/exhaustive-deps -- venue read from mutable mock
    [config, venue.planId, venue.status, venueTick],
  )
  const platformGrants = useMemo(
    () =>
      ({
        kitchen: platform.service.kitchenDisplay,
        qrOrdering: platform.service.onlineOrdering,
      }) as Partial<Record<FeatureKey, boolean>>,
    [platform.service.kitchenDisplay, platform.service.onlineOrdering],
  )

  const value = useMemo<TenantContextValue>(
    () => ({
      config: effectiveConfig,
      features: resolveFeatures(effectiveConfig, industryProfile.featureDefaults, platformGrants),
      readOnly: isReadOnly(effectiveConfig.status),
      limit: (key: LimitKey) => resolveLimit(effectiveConfig, key),
      setPlan,
      setStatus,
      setOverride,
      reset,
    }),
    // planCatalog: live entitlements from PlansProvider
    // industryProfile / platformGrants: industry + platform layers
    [
      effectiveConfig,
      planCatalog,
      industryProfile,
      platformGrants,
      setPlan,
      setStatus,
      setOverride,
      reset,
    ],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within a <TenantProvider>')
  return ctx
}

/** The only question a screen should ask about entitlement. */
export function useFeature(feature: FeatureKey): boolean {
  return useTenant().features[feature]
}
