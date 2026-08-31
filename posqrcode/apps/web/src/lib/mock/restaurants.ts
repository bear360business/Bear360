import type { Restaurant } from '../types'
import { DEFAULT_GST_RATE_PCT } from '../tax'
import { chickenBiryaniPlatterPhoto } from './menu'

const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/bearqr-${seed}/${w}/${h}`

function make(
  r: Pick<
    Restaurant,
    | 'id'
    | 'name'
    | 'emoji'
    | 'ownerName'
    | 'ownerEmail'
    | 'city'
    | 'cuisine'
    | 'planId'
    | 'status'
    | 'mrr'
    | 'rating'
    | 'createdAt'
  > &
    Partial<Restaurant>,
): Restaurant {
  return {
    slug: r.id,
    phone: r.phone ?? '+91 98765 43210',
    isOpen: r.isOpen ?? true,
    gstRatePct: r.gstRatePct ?? DEFAULT_GST_RATE_PCT,
    currency: 'INR',
    industryId: r.industryId ?? 'restaurants',
    coverImage: img(`${r.id}-cover`, 960, 480),
    logoImage: img(`${r.id}-logo`, 112, 112),
    ...r,
  }
}

const ACTIVE_VENUE_KEY = 'bearqr:current-restaurant-id'
export const CURRENT_VENUE_EVENT = 'bearqr:current-venue'

function readActiveVenueId(): string {
  try {
    const fromStorage = localStorage.getItem(ACTIVE_VENUE_KEY)
    if (fromStorage) return fromStorage
    const rawSession = localStorage.getItem('bearqr:session')
    if (rawSession) {
      const session = JSON.parse(rawSession) as { restaurantId?: string; restaurantIds?: string[] }
      if (session.restaurantId) return session.restaurantId
      if (session.restaurantIds && session.restaurantIds[0]) return session.restaurantIds[0]
    }
    return 'masala-bear'
  } catch {
    return 'masala-bear'
  }
}

/**
 * Active admin venue id. Mutable so onboarding / venue switch can change it.
 * Prefer `getCurrentRestaurantId()` in new code; this export stays for callers.
 */
export let currentRestaurantId = readActiveVenueId()

export function getCurrentRestaurantId(): string {
  return currentRestaurantId
}

export function setCurrentRestaurantId(id: string) {
  if (!id) return
  const changed = id !== currentRestaurantId
  currentRestaurantId = id
  try {
    localStorage.setItem(ACTIVE_VENUE_KEY, id)
  } catch {
    /* ignore */
  }
  // Keep entitlement tenant row aligned with the active venue's plan/status.
  try {
    const venue = restaurants.find((r) => r.id === id || r.slug === id)
    if (venue) {
      const raw = localStorage.getItem('bearqr:tenant')
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      const statusMap: Record<string, string> = {
        trial: 'trial',
        active: 'active',
        suspended: 'suspended',
        expired: 'expired',
      }
      localStorage.setItem(
        'bearqr:tenant',
        JSON.stringify({
          ...prev,
          planId: venue.planId,
          status: statusMap[venue.status] ?? prev.status ?? 'active',
        }),
      )
    }
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    if (changed) {
      window.dispatchEvent(new Event(CURRENT_VENUE_EVENT))
      window.dispatchEvent(new Event('bearqr:data-venue'))
    }
    window.dispatchEvent(new Event('bearqr:tenant-resync'))
  }
}

/** Canonical seed — `useRestaurants` syncs the live `restaurants` array from this + LS. */
export const seedRestaurants: Restaurant[] = [
  make({
    id: 'masala-bear',
    name: 'Masala Bear',
    emoji: '🍛',
    ownerName: 'Riya Sharma',
    ownerEmail: 'riya@masalabear.in',
    city: 'Mumbai',
    cuisine: 'North & South Indian',
    industryId: 'restaurants',
    planId: 'professional',
    status: 'active',
    mrr: 2499,
    rating: 4.6,
    gstin: '27AABCM9407D1ZS',
    coverImage: chickenBiryaniPlatterPhoto,
    createdAt: '2025-11-14',
  }),
  make({
    id: 'dosa-junction',
    name: 'Dosa Junction',
    emoji: '🥞',
    ownerName: 'Meera Iyer',
    ownerEmail: 'meera@dosajunction.in',
    city: 'Bengaluru',
    cuisine: 'South Indian · Udupi',
    industryId: 'cafes',
    planId: 'basic',
    status: 'trial',
    mrr: 0,
    rating: 4.3,
    createdAt: '2026-07-28',
  }),
  make({
    id: 'biryani-bay',
    name: 'Biryani Bay',
    emoji: '🍚',
    ownerName: 'Arif Khan',
    ownerEmail: 'arif@biryanibay.in',
    city: 'Hyderabad',
    cuisine: 'Biryani · Mughlai',
    industryId: 'cloud-kitchens',
    planId: 'professional',
    status: 'suspended',
    mrr: 2499,
    rating: 4.1,
    createdAt: '2025-08-02',
  }),
  make({
    id: 'punjab-da-dhaba',
    name: 'Punjab Da Dhaba',
    emoji: '🫓',
    ownerName: 'Gurpreet Singh',
    ownerEmail: 'gurpreet@punjabdadhaba.in',
    city: 'Amritsar',
    cuisine: 'Punjabi · Tandoor',
    industryId: 'restaurants',
    planId: 'professional',
    status: 'active',
    mrr: 2499,
    rating: 4.7,
    createdAt: '2025-06-19',
  }),
  make({
    id: 'chaat-street',
    name: 'Chaat Street',
    emoji: '🥗',
    ownerName: 'Kavita Joshi',
    ownerEmail: 'kavita@chaatstreet.in',
    city: 'Delhi',
    cuisine: 'Chaat · Street food',
    industryId: 'food-trucks',
    planId: 'basic',
    status: 'active',
    mrr: 999,
    rating: 4.4,
    createdAt: '2026-01-09',
  }),
  make({
    id: 'thali-house',
    name: 'Thali House',
    emoji: '🍽️',
    ownerName: 'Hetal Shah',
    ownerEmail: 'hetal@thalihouse.in',
    city: 'Ahmedabad',
    cuisine: 'Gujarati Thali',
    industryId: 'mess-canteens',
    planId: 'enterprise',
    status: 'active',
    mrr: 9999,
    rating: 4.5,
    createdAt: '2025-03-27',
  }),
  make({
    id: 'coastal-curry',
    name: 'Coastal Curry',
    emoji: '🐟',
    ownerName: 'Anita Menon',
    ownerEmail: 'anita@coastalcurry.in',
    city: 'Kochi',
    cuisine: 'Kerala · Seafood',
    industryId: 'hotels',
    planId: 'professional',
    status: 'active',
    mrr: 2499,
    rating: 4.8,
    createdAt: '2025-09-30',
  }),
  make({
    id: 'tandoor-tales',
    name: 'Tandoor Tales',
    emoji: '🍢',
    ownerName: 'Vikram Rathore',
    ownerEmail: 'vikram@tandoortales.in',
    city: 'Jaipur',
    cuisine: 'Rajasthani · Tandoor',
    industryId: 'resorts',
    planId: 'basic',
    status: 'trial',
    mrr: 0,
    rating: 4.2,
    createdAt: '2026-07-31',
  }),
  make({
    id: 'kebab-kings',
    name: 'Kebab Kings',
    emoji: '🥙',
    ownerName: 'Imran Qureshi',
    ownerEmail: 'imran@kebabkings.in',
    city: 'Lucknow',
    cuisine: 'Awadhi · Kebabs',
    planId: 'basic',
    status: 'expired',
    mrr: 0,
    rating: 3.9,
    createdAt: '2024-12-05',
  }),
  make({
    id: 'mithai-mahal',
    name: 'Mithai Mahal',
    emoji: '🍬',
    ownerName: 'Sourav Ghosh',
    ownerEmail: 'sourav@mithaimahal.in',
    city: 'Kolkata',
    cuisine: 'Bengali · Mithai',
    planId: 'enterprise',
    status: 'active',
    mrr: 9999,
    rating: 4.6,
    createdAt: '2025-02-11',
  }),
  make({
    id: 'paratha-junction',
    name: 'Paratha Junction',
    emoji: '🧈',
    ownerName: 'Manoj Aggarwal',
    ownerEmail: 'manoj@parathajunction.in',
    city: 'Chandigarh',
    cuisine: 'Parathas · Dhaba',
    planId: 'basic',
    status: 'active',
    mrr: 999,
    rating: 4.0,
    createdAt: '2026-04-22',
  }),
  make({
    id: 'udupi-palace',
    name: 'Udupi Palace',
    emoji: '🥥',
    ownerName: 'Suresh Rao',
    ownerEmail: 'suresh@udupipalace.in',
    city: 'Chennai',
    cuisine: 'Udupi · Pure veg',
    planId: 'professional',
    status: 'active',
    mrr: 2499,
    rating: 4.5,
    createdAt: '2025-10-18',
  }),
  make({
    id: 'goa-grill',
    name: 'Goa Grill',
    emoji: '🦐',
    ownerName: 'Savio Fernandes',
    ownerEmail: 'savio@goagrill.in',
    city: 'Panaji',
    cuisine: 'Goan · Seafood',
    planId: 'professional',
    status: 'trial',
    mrr: 0,
    rating: 4.3,
    createdAt: '2026-08-01',
  }),
]

/** Live list mutated by `useRestaurants` after API hydrate — starts empty (no seed fixtures). */
export const restaurants: Restaurant[] = []

/** Platform-wide headline; list length is the demo page. */
export function getRestaurantListCount(): number {
  return Math.max(restaurants.length, 1)
}

/** @deprecated Prefer getRestaurantListCount() — kept for older imports. */
export const totalRestaurantCount = 128

export function syncRestaurantsMock(list: Restaurant[]) {
  restaurants.splice(0, restaurants.length, ...list.map((r) => ({ ...r })))
}

export function getRestaurantById(id: string): Restaurant | undefined {
  return restaurants.find((r) => r.id === id || r.slug === id)
}

const EMPTY_CURRENT: Restaurant = {
  id: '',
  slug: '',
  name: 'No venue',
  emoji: '🍽️',
  ownerName: '',
  ownerEmail: '',
  phone: '',
  city: '',
  cuisine: '',
  industryId: 'restaurants',
  planId: 'basic',
  status: 'trial',
  mrr: 0,
  rating: 0,
  isOpen: true,
  gstRatePct: 5,
  currency: 'INR',
  coverImage: '',
  logoImage: '',
  createdAt: '',
}

/** Active admin venue from API-synced list (never falls back to seed fixtures). */
export function getCurrentRestaurant(): Restaurant {
  return getRestaurantById(currentRestaurantId) ?? EMPTY_CURRENT
}

export function slugifyVenue(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || `venue-${Date.now().toString(36)}`
  )
}
