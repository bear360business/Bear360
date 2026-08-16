import {
  Building2,
  Cloud,
  Coffee,
  Leaf,
  MapPin,
  ShoppingBag,
  Truck,
  UserRound,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { OrderType } from './types'
import type { FeatureKey } from './tenant'

/** Venue / business vertical Bear 360 serves. */
export type IndustryId =
  | 'restaurants'
  | 'cafes'
  | 'cloud-kitchens'
  | 'mess-canteens'
  | 'catering'
  | 'hotels'
  | 'resorts'
  | 'bakeries'
  | 'nutrition'
  | 'food-trucks'

export const INDUSTRY_IDS: IndustryId[] = [
  'restaurants',
  'cafes',
  'cloud-kitchens',
  'mess-canteens',
  'catering',
  'hotels',
  'resorts',
  'bakeries',
  'nutrition',
  'food-trucks',
]

export interface IndustryLabels {
  /** e.g. Restaurant, Hotel, Cloud kitchen */
  venue: string
  /** Singular space unit — Table, Room, Counter */
  space: string
  /** Plural — Tables, Rooms */
  spaces: string
  /** Catalog noun — Menu, Items */
  catalog: string
}

export interface IndustryServiceDefaults {
  orderTypes: Record<OrderType, boolean>
  counterOrdering: boolean
}

export interface IndustryNavHints {
  /** Admin nav paths hidden by this industry pack (not a plan lock). */
  hide: string[]
}

/**
 * Runtime industry pack — shapes modules, copy, and service defaults.
 * Icons stay in INDUSTRY_ICONS (not persisted).
 */
export interface IndustryProfile {
  id: IndustryId
  name: string
  caption: string
  /**
   * Absent key = allow (industry does not block).
   * `false` = industry hides/blocks even if the plan grants it.
   */
  featureDefaults: Partial<Record<FeatureKey, boolean>>
  serviceDefaults: IndustryServiceDefaults
  labels: IndustryLabels
  navHints: IndustryNavHints
}

/** Display shape used by pickers / marketing (profile + icon). */
export interface Industry extends IndustryProfile {
  icon: LucideIcon
}

export const INDUSTRY_ICONS: Record<IndustryId, LucideIcon> = {
  restaurants: UtensilsCrossed,
  cafes: Coffee,
  'cloud-kitchens': Cloud,
  'mess-canteens': UserRound,
  catering: Truck,
  hotels: Building2,
  resorts: MapPin,
  bakeries: ShoppingBag,
  nutrition: Leaf,
  'food-trucks': Truck,
}

const dineInFull: IndustryServiceDefaults = {
  orderTypes: { 'dine-in': true, takeaway: true, delivery: true },
  counterOrdering: true,
}

const counterFirst: IndustryServiceDefaults = {
  orderTypes: { 'dine-in': false, takeaway: true, delivery: true },
  counterOrdering: true,
}

const retailLean: IndustryServiceDefaults = {
  orderTypes: { 'dine-in': false, takeaway: true, delivery: true },
  counterOrdering: true,
}

function profile(
  id: IndustryId,
  name: string,
  caption: string,
  partial: Omit<IndustryProfile, 'id' | 'name' | 'caption'>,
): IndustryProfile {
  return { id, name, caption, ...partial }
}

/** Seed packs for all 10 verticals. */
export function defaultIndustryProfiles(): IndustryProfile[] {
  return [
    profile('restaurants', 'Restaurants', 'Digital menus & POS billing', {
      featureDefaults: { tables: true, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: dineInFull,
      labels: { venue: 'Restaurant', space: 'Table', spaces: 'Tables', catalog: 'Menu' },
      navHints: { hide: [] },
    }),
    profile('cafes', 'Cafes', 'Fast billing & queue-busting', {
      featureDefaults: { tables: true, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: dineInFull,
      labels: { venue: 'Cafe', space: 'Table', spaces: 'Tables', catalog: 'Menu' },
      navHints: { hide: [] },
    }),
    profile('cloud-kitchens', 'Cloud Kitchens', 'Multi-brand & zero commission', {
      featureDefaults: { tables: false, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: counterFirst,
      labels: {
        venue: 'Cloud kitchen',
        space: 'Station',
        spaces: 'Stations',
        catalog: 'Menu',
      },
      navHints: { hide: ['/tables'] },
    }),
    profile('mess-canteens', 'Mess & Canteens', 'Meal-plans & ID tracking', {
      featureDefaults: { tables: true, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: {
        orderTypes: { 'dine-in': true, takeaway: true, delivery: false },
        counterOrdering: true,
      },
      labels: { venue: 'Mess', space: 'Seat', spaces: 'Seats', catalog: 'Menu' },
      navHints: { hide: [] },
    }),
    profile('catering', 'Catering Services', 'Digital packages & inquiries', {
      featureDefaults: { tables: false, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: retailLean,
      labels: {
        venue: 'Catering',
        space: 'Event',
        spaces: 'Events',
        catalog: 'Packages',
      },
      navHints: { hide: ['/tables'] },
    }),
    profile('hotels', 'Hotels', 'In-room QR dining & POS', {
      featureDefaults: { tables: true, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: {
        orderTypes: { 'dine-in': true, takeaway: true, delivery: false },
        counterOrdering: true,
      },
      labels: { venue: 'Hotel', space: 'Room', spaces: 'Rooms', catalog: 'Menu' },
      navHints: { hide: [] },
    }),
    profile('resorts', 'Resorts', 'Poolside & property-wide QR', {
      featureDefaults: { tables: true, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: dineInFull,
      labels: {
        venue: 'Resort',
        space: 'Outlet',
        spaces: 'Outlets',
        catalog: 'Menu',
      },
      navHints: { hide: [] },
    }),
    profile('bakeries', 'Bakeries', 'Custom cakes & retail billing', {
      featureDefaults: { tables: false, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: retailLean,
      labels: {
        venue: 'Bakery',
        space: 'Counter',
        spaces: 'Counters',
        catalog: 'Menu',
      },
      navHints: { hide: ['/tables'] },
    }),
    profile('nutrition', 'Nutrition Centers', 'Macros & diet-plan tracking', {
      featureDefaults: { tables: false, qrOrdering: true, pos: true, kitchen: false },
      serviceDefaults: retailLean,
      labels: {
        venue: 'Nutrition center',
        space: 'Station',
        spaces: 'Stations',
        catalog: 'Menu',
      },
      navHints: { hide: ['/tables', '/kitchen'] },
    }),
    profile('food-trucks', 'Food Trucks', 'Mobile checkout & offline POS', {
      featureDefaults: { tables: false, qrOrdering: true, pos: true, kitchen: true },
      serviceDefaults: counterFirst,
      labels: {
        venue: 'Food truck',
        space: 'Window',
        spaces: 'Windows',
        catalog: 'Menu',
      },
      navHints: { hide: ['/tables'] },
    }),
  ]
}

/** @deprecated Prefer getIndustryProfile / withIndustryIcon from the catalog. */
export const INDUSTRIES: Industry[] = defaultIndustryProfiles().map((p) => ({
  ...p,
  icon: INDUSTRY_ICONS[p.id],
}))

export function withIndustryIcon(profile: IndustryProfile): Industry {
  return { ...profile, icon: INDUSTRY_ICONS[profile.id] }
}

export function isIndustryId(id: string | undefined): id is IndustryId {
  return !!id && (INDUSTRY_IDS as string[]).includes(id)
}

export function getIndustryById(id: IndustryId | string | undefined): Industry | undefined {
  if (!id || !isIndustryId(id)) return undefined
  const fromDefaults = defaultIndustryProfiles().find((i) => i.id === id)
  if (!fromDefaults) return undefined
  return withIndustryIcon(fromDefaults)
}
