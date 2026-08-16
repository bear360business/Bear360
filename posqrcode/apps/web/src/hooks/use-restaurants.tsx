import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_GST_RATE_PCT } from '@/lib/tax'
import {
  apiCreateTenant,
  apiDeleteTenant,
  apiListTenants,
  apiUpdateTenant,
  type ApiRestaurant,
} from '@/lib/api-tenants'
import { getAccessToken } from '@/lib/api-client'
import { reportApiError } from '@/lib/api-error'
import { hydrateFromTenantSettings } from '@/lib/hydrate-tenant-settings'
import {
  CURRENT_VENUE_EVENT,
  currentRestaurantId,
  getCurrentRestaurantId,
  setCurrentRestaurantId,
  slugifyVenue,
  syncRestaurantsMock,
} from '@/lib/mock/restaurants'
import { getCatalogPlanById } from '@/lib/plans-catalog'
import { useMockData } from '@/lib/runtime-config'
import { syncTenantFromVenue } from '@/lib/venue-entitlements'
import type { IndustryId, PlanId, Restaurant, RestaurantStatus } from '@/lib/types'

export const RESTAURANTS_STORAGE_KEY = 'bearqr:restaurants'

export type VenueDraft = {
  name: string
  slug?: string
  ownerName: string
  ownerEmail: string
  phone?: string
  city?: string
  address?: string
  mapsLink?: string
  whatsapp?: string
  country?: string
  cuisine?: string
  industryId: IndustryId
  planId: PlanId
  gstin?: string
  gstRatePct?: number
  emoji?: string
  currency?: string
  logoImage?: string
  coverImage?: string
}

interface RestaurantsContextValue {
  restaurants: Restaurant[]
  count: number
  getById: (id: string) => Restaurant | undefined
  create: (draft: VenueDraft) => Promise<Restaurant>
  update: (id: string, patch: Partial<Restaurant>) => Promise<Restaurant | undefined>
  setStatus: (id: string, status: RestaurantStatus) => void
  remove: (id: string) => Promise<boolean>
  reset: () => void
}

const RestaurantsContext = createContext<RestaurantsContextValue | null>(null)

function readStored(): Restaurant[] {
  try {
    const raw = localStorage.getItem(RESTAURANTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Restaurant[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((r) => normalizeRestaurant(r))
  } catch {
    return []
  }
}

function writeStored(list: Restaurant[]) {
  try {
    localStorage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function normalizeRestaurant(raw: Partial<Restaurant>): Restaurant {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `venue-${Date.now().toString(36)}`
  const name = (raw.name ?? 'Untitled venue').trim() || 'Untitled venue'
  return {
    id,
    slug: (raw.slug ?? id).trim() || id,
    name,
    emoji: raw.emoji ?? '🍽️',
    ownerName: raw.ownerName ?? 'Owner',
    ownerEmail: raw.ownerEmail ?? 'owner@bear360.app',
    phone: raw.phone ?? '+91 98765 43210',
    city: raw.city ?? '',
    address: raw.address,
    mapsLink: raw.mapsLink,
    whatsapp: raw.whatsapp,
    showEmail: raw.showEmail,
    logoOnReceipt: raw.logoOnReceipt,
    country: raw.country,
    statusBeforeSuspend: raw.statusBeforeSuspend,
    instagram: raw.instagram,
    facebook: raw.facebook,
    youtube: raw.youtube,
    website: raw.website,
    closesAt: raw.closesAt,
    opensAt: raw.opensAt,
    cuisine: raw.cuisine ?? '',
    industryId: raw.industryId ?? 'restaurants',
    planId: (raw.planId as PlanId) ?? 'professional',
    status: raw.status ?? 'trial',
    mrr: typeof raw.mrr === 'number' ? raw.mrr : 0,
    rating: typeof raw.rating === 'number' ? raw.rating : 0,
    isOpen: raw.isOpen ?? true,
    gstRatePct: typeof raw.gstRatePct === 'number' ? raw.gstRatePct : DEFAULT_GST_RATE_PCT,
    gstin: raw.gstin,
    currency: raw.currency ?? 'INR',
    coverImage: raw.coverImage ?? `https://picsum.photos/seed/bearqr-${id}-cover/960/480`,
    logoImage: raw.logoImage ?? `https://picsum.photos/seed/bearqr-${id}-logo/112/112`,
    createdAt: raw.createdAt ?? new Date().toISOString().slice(0, 10),
  }
}

function mrrForPlan(planId: PlanId): number {
  const plan = getCatalogPlanById(planId)
  return plan?.priceMonthly ?? 0
}

function mapApiRestaurant(row: ApiRestaurant, existing?: Restaurant): Restaurant {
  const status: RestaurantStatus =
    row.status === 'cancelled'
      ? 'expired'
      : row.status === 'past_due'
        ? 'active'
        : (row.status as RestaurantStatus)
  if (row.settings) {
    hydrateFromTenantSettings(row.id, row.settings)
  }
  return normalizeRestaurant({
    ...existing,
    id: row.id,
    slug: row.slug,
    name: row.name,
    phone: row.phone,
    address: row.address ?? existing?.address,
    city: row.city || existing?.city || '',
    country: row.country ?? existing?.country,
    cuisine: row.cuisine ?? existing?.cuisine,
    ownerName: row.ownerName ?? existing?.ownerName,
    ownerEmail: row.ownerEmail ?? existing?.ownerEmail,
    whatsapp: row.whatsapp ?? existing?.whatsapp,
    mapsLink: row.mapsLink ?? existing?.mapsLink,
    planId: row.planId,
    industryId: (row.industryId as IndustryId) || existing?.industryId || 'restaurants',
    status,
    gstRatePct: Number(row.gstRatePct) || existing?.gstRatePct,
    gstin: row.gstin ?? existing?.gstin,
    currency: row.currency ?? existing?.currency,
    emoji: row.emoji ?? existing?.emoji,
    logoImage: row.logoImage ?? existing?.logoImage,
    coverImage: row.coverImage ?? existing?.coverImage,
    isOpen: row.isOpen ?? existing?.isOpen,
    opensAt: row.opensAt ?? existing?.opensAt,
    closesAt: row.closesAt ?? existing?.closesAt,
    mrr: existing?.mrr ?? mrrForPlan(row.planId),
  })
}

export function RestaurantsProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const [list, setList] = useState<Restaurant[]>(() => {
    const initial = mock ? readStored() : []
    syncRestaurantsMock(initial)
    return initial
  })

  useEffect(() => {
    writeStored(list)
    syncRestaurantsMock(list)
  }, [list])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === RESTAURANTS_STORAGE_KEY || e.key === null) {
        const next = readStored()
        syncRestaurantsMock(next)
        setList(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (mock) return
    let cancelled = false
    const hydrate = () => {
      if (!getAccessToken()) return
      void apiListTenants()
        .then((rows) => {
          if (cancelled) return
          setList((prev) => {
            const byId = new Map(prev.map((r) => [r.id, r]))
            const next = rows.map((row) => mapApiRestaurant(row, byId.get(row.id)))
            syncRestaurantsMock(next)
            writeStored(next)
            return next
          })
        })
        .catch((err) => {
          if (getAccessToken()) reportApiError(err, 'Could not load restaurants')
        })
    }
    hydrate()
    window.addEventListener('bearqr:auth-changed', hydrate)
    return () => {
      cancelled = true
      window.removeEventListener('bearqr:auth-changed', hydrate)
    }
  }, [mock])

  const create = useCallback(async (draft: VenueDraft) => {
    const row = await apiCreateTenant({
      name: draft.name.trim(),
      slug: slugifyVenue(draft.slug?.trim() || draft.name),
      ownerName: draft.ownerName.trim(),
      ownerEmail: draft.ownerEmail.trim(),
      phone: draft.phone,
      city: draft.city,
      address: draft.address,
      mapsLink: draft.mapsLink,
      whatsapp: draft.whatsapp,
      country: draft.country,
      cuisine: draft.cuisine,
      industryId: draft.industryId,
      planId: draft.planId,
      gstin: draft.gstin,
      gstRatePct: draft.gstRatePct,
      currency: draft.currency,
      emoji: draft.emoji,
      logoImage: draft.logoImage,
      coverImage: draft.coverImage,
      provisionOwnerEmail: draft.ownerEmail.trim() || undefined,
    })
    const created = mapApiRestaurant(row)
    setList((prev) => {
      const next = [created, ...prev.filter((r) => r.id !== created.id)]
      syncRestaurantsMock(next)
      return next
    })
    syncTenantFromVenue(created)
    return created
  }, [])

  const update = useCallback(
    async (id: string, patch: Partial<Restaurant>) => {
      if (!mock) {
        const row = await apiUpdateTenant(id, {
          name: patch.name,
          slug: patch.slug,
          ownerName: patch.ownerName,
          ownerEmail: patch.ownerEmail,
          phone: patch.phone,
          city: patch.city,
          address: patch.address,
          mapsLink: patch.mapsLink,
          whatsapp: patch.whatsapp,
          country: patch.country,
          cuisine: patch.cuisine,
          industryId: patch.industryId,
          planId: patch.planId,
          gstin: patch.gstin,
          gstRatePct: patch.gstRatePct,
          currency: patch.currency,
          emoji: patch.emoji,
          logoImage: patch.logoImage,
          coverImage: patch.coverImage,
          isOpen: patch.isOpen,
          opensAt: patch.opensAt,
          closesAt: patch.closesAt,
          status:
            patch.status === 'expired'
              ? 'cancelled'
              : patch.status === 'suspended'
                ? 'suspended'
                : patch.status === 'trial'
                  ? 'trial'
                  : patch.status === 'active'
                    ? 'active'
                    : undefined,
        })
        const updated = mapApiRestaurant(row)
        setList((prev) => {
          const next = prev.map((r) => (r.id === id || r.slug === id ? updated : r))
          syncRestaurantsMock(next)
          return next
        })
        syncTenantFromVenue(updated)
        return updated
      }

      let updated: Restaurant | undefined
      setList((prev) => {
        const next = prev.map((r) => {
          if (r.id !== id && r.slug !== id) return r
          updated = {
            ...r,
            ...patch,
            id: r.id,
            mrr:
              patch.planId && patch.planId !== r.planId
                ? mrrForPlan(patch.planId)
                : (patch.mrr ?? r.mrr),
          }
          return updated
        })
        syncRestaurantsMock(next)
        return next
      })
      if (updated) syncTenantFromVenue(updated)
      return updated
    },
    [mock],
  )

  const setStatus = useCallback(
    (id: string, status: RestaurantStatus) => {
      if (!mock) {
        const apiStatus =
          status === 'expired'
            ? 'cancelled'
            : status === 'suspended'
              ? 'suspended'
              : status === 'trial'
                ? 'trial'
                : 'active'
        void apiUpdateTenant(id, { status: apiStatus })
          .then((row) => {
            const updated = mapApiRestaurant(row)
            setList((prev) => {
              const next = prev.map((r) => (r.id === id || r.slug === id ? updated : r))
              syncRestaurantsMock(next)
              return next
            })
            syncTenantFromVenue(updated)
          })
          .catch((err) => reportApiError(err))
      }
      let updated: Restaurant | undefined
      setList((prev) => {
        const next = prev.map((r) => {
          if (r.id !== id && r.slug !== id) return r
          if (status === 'suspended' && r.status !== 'suspended') {
            updated = { ...r, status, statusBeforeSuspend: r.status }
          } else if (status !== 'suspended' && r.status === 'suspended') {
            const restored = r.statusBeforeSuspend ?? status
            updated = {
              ...r,
              status: restored,
              statusBeforeSuspend: undefined,
            }
          } else {
            updated = { ...r, status }
          }
          return updated
        })
        syncRestaurantsMock(next)
        return next
      })
      if (updated) syncTenantFromVenue(updated)
    },
    [mock],
  )

  const remove = useCallback(
    async (id: string) => {
      if (id === currentRestaurantId) return false
      const target = list.find((r) => r.id === id || r.slug === id)
      if (!target || target.id === currentRestaurantId) return false

      if (!mock) {
        try {
          await apiDeleteTenant(target.id)
        } catch (err) {
          reportApiError(err, 'Could not delete restaurant')
          return false
        }
      }

      setList((prev) => {
        const next = prev.filter((r) => r.id !== target.id && r.slug !== target.id)
        syncRestaurantsMock(next)
        writeStored(next)
        return next
      })
      return true
    },
    [list, mock],
  )

  const reset = useCallback(() => {
    writeStored([])
    syncRestaurantsMock([])
    setList([])
  }, [])

  const value = useMemo<RestaurantsContextValue>(
    () => ({
      restaurants: list,
      count: list.length,
      getById: (id: string) => list.find((r) => r.id === id || r.slug === id),
      create,
      update,
      setStatus,
      remove,
      reset,
    }),
    [list, create, update, setStatus, remove, reset],
  )

  return <RestaurantsContext.Provider value={value}>{children}</RestaurantsContext.Provider>
}

export function useRestaurants(): RestaurantsContextValue {
  const ctx = useContext(RestaurantsContext)
  if (!ctx) throw new Error('useRestaurants must be used within a <RestaurantsProvider>')
  return ctx
}

const EMPTY_VENUE: Restaurant = {
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
  gstRatePct: DEFAULT_GST_RATE_PCT,
  currency: 'INR',
  coverImage: '',
  logoImage: '',
  createdAt: '',
}

export function useCurrentVenue(): Restaurant {
  const { getById, restaurants: list } = useRestaurants()
  const [activeId, setActiveId] = useState(() => getCurrentRestaurantId())

  useEffect(() => {
    const sync = () => setActiveId(getCurrentRestaurantId())
    window.addEventListener(CURRENT_VENUE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CURRENT_VENUE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return getById(activeId) ?? list[0] ?? EMPTY_VENUE
}

export { setCurrentRestaurantId }
