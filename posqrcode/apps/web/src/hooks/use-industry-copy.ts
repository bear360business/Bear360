import { useSyncExternalStore } from 'react'
import { CURRENT_VENUE_EVENT, getCurrentRestaurant } from '@/lib/mock'
import {
  getIndustryProfile,
  subscribeIndustryCatalog,
} from '@/lib/industries-catalog'
import type { IndustryLabels, IndustryProfile } from '@/lib/industries'

/** Re-render when Settings changes venue industryId or active venue switches. */
let venueIndustryEpoch = 0
const venueListeners = new Set<() => void>()

export function notifyVenueIndustryChanged() {
  venueIndustryEpoch += 1
  venueListeners.forEach((l) => l())
}

export function subscribeVenueIndustry(cb: () => void) {
  venueListeners.add(cb)
  const onVenue = () => cb()
  window.addEventListener(CURRENT_VENUE_EVENT, onVenue)
  const unsubCatalog = subscribeIndustryCatalog(cb)
  return () => {
    venueListeners.delete(cb)
    window.removeEventListener(CURRENT_VENUE_EVENT, onVenue)
    unsubCatalog()
  }
}

export function getVenueIndustryEpoch() {
  return venueIndustryEpoch
}

/** Live industry pack for the current admin venue (API-synced list, never seed fixture). */
export function useIndustryProfile(): IndustryProfile {
  useSyncExternalStore(subscribeVenueIndustry, getVenueIndustryEpoch, getVenueIndustryEpoch)
  const restaurant = getCurrentRestaurant()
  return getIndustryProfile(restaurant.industryId || 'restaurants')
}

/** Soft copy dictionary — Tables → Rooms, Menu → Packages, etc. */
export function useIndustryCopy(): IndustryLabels {
  return useIndustryProfile().labels
}
