/** Keep restaurant row plan/status aligned with the live tenant entitlement blob. */

import {
  DEFAULT_SERVICE_CONFIG,
  SERVICE_CONFIG_STORAGE_KEY,
  mergeServiceConfig,
  serviceConfigFromIndustry,
} from '@/lib/service-config'
import { getCurrentRestaurantId } from '@/lib/mock/restaurants'
import { TENANT_STORAGE_KEY, type PlanId, type TenantStatus } from '@/lib/tenant'
import type { IndustryId, RestaurantStatus } from '@/lib/types'
import { writeVenueScoped } from '@/lib/venue-scope'

export function restaurantStatusToTenant(status: RestaurantStatus): TenantStatus {
  if (status === 'trial') return 'trial'
  if (status === 'suspended') return 'suspended'
  if (status === 'expired') return 'expired'
  return 'active'
}

/** Write plan/status into `bearqr:tenant` when the venue is the active admin venue. */
export function syncTenantFromVenue(venue: {
  id: string
  slug?: string
  planId: PlanId
  status: RestaurantStatus
}): void {
  const current = getCurrentRestaurantId()
  if (venue.id !== current && venue.slug !== current) return
  try {
    const raw = localStorage.getItem(TENANT_STORAGE_KEY)
    const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    localStorage.setItem(
      TENANT_STORAGE_KEY,
      JSON.stringify({
        ...prev,
        planId: venue.planId,
        status: restaurantStatusToTenant(venue.status),
      }),
    )
    window.dispatchEvent(new Event('bearqr:tenant-resync'))
  } catch {
    /* ignore */
  }
}

/** Apply industry pack service defaults for any venue (not only the active one). */
export function applyIndustryDefaultsForVenue(
  venueId: string,
  industryId: IndustryId | string,
): void {
  try {
    const key = `${SERVICE_CONFIG_STORAGE_KEY}:${venueId}`
    const raw = localStorage.getItem(key)
    const current = raw ? mergeServiceConfig(JSON.parse(raw)) : DEFAULT_SERVICE_CONFIG
    const next = serviceConfigFromIndustry(industryId, current)
    writeVenueScoped(SERVICE_CONFIG_STORAGE_KEY, venueId, next)
    if (venueId === getCurrentRestaurantId()) {
      window.dispatchEvent(new Event('bearqr:data-venue'))
    }
  } catch {
    /* ignore */
  }
}
