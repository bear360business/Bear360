import { CURRENT_VENUE_EVENT, getCurrentRestaurantId } from '@/lib/mock/restaurants'

/** Fired when guest route venue or admin current venue changes — providers reload. */
export const DATA_VENUE_EVENT = 'bearqr:data-venue'

/** Build a per-venue localStorage key. */
export function venueKey(base: string, restaurantId: string): string {
  return `${base}:${restaurantId}`
}

let lastNotifiedVenueId = ''

export function notifyDataVenueChanged(venueId?: string) {
  const current = venueId ?? resolveDataVenueId()
  if (current === lastNotifiedVenueId) return
  lastNotifiedVenueId = current
  try {
    window.dispatchEvent(new Event(DATA_VENUE_EVENT))
  } catch {
    /* ignore */
  }
}

/**
 * Resolve which venue's operational data should load.
 * Guest `/r/:id` wins; otherwise the admin's current restaurant.
 */
export function resolveDataVenueId(pathname = typeof window !== 'undefined' ? window.location.pathname : ''): string {
  const m = pathname.match(/^\/r\/([^/]+)/)
  if (m?.[1]) return decodeURIComponent(m[1])
  return getCurrentRestaurantId()
}

export function subscribeVenueScope(onChange: () => void): () => void {
  const onVenue = () => onChange()
  window.addEventListener(CURRENT_VENUE_EVENT, onVenue)
  window.addEventListener(DATA_VENUE_EVENT, onVenue)
  window.addEventListener('popstate', onVenue)
  return () => {
    window.removeEventListener(CURRENT_VENUE_EVENT, onVenue)
    window.removeEventListener(DATA_VENUE_EVENT, onVenue)
    window.removeEventListener('popstate', onVenue)
  }
}

/**
 * Read venue-scoped JSON. Legacy unscoped keys are deleted (never adopted) —
 * they were mock fixtures and caused first-paint fake data before API hydrate.
 */
export function readVenueScoped<T>(
  baseKey: string,
  restaurantId: string,
  fallback: T,
): T {
  try {
    const scoped = localStorage.getItem(venueKey(baseKey, restaurantId))
    if (scoped) return JSON.parse(scoped) as T
    // Drop unscoped leftovers from older builds — do not migrate into scoped cache.
    if (localStorage.getItem(baseKey) != null) localStorage.removeItem(baseKey)
    return fallback
  } catch {
    return fallback
  }
}

export function writeVenueScoped(baseKey: string, restaurantId: string, value: unknown): void {
  try {
    localStorage.setItem(venueKey(baseKey, restaurantId), JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
