import { useEffect, useState } from 'react'
import {
  apiPublicTable,
  apiPublicVenue,
  type PublicTable,
  type PublicVenue,
} from '@/lib/api-orders'
import { hydrateFromTenantSettings } from '@/lib/hydrate-tenant-settings'
import type { DiningTable, Restaurant } from '@/lib/types'

function mapVenue(v: PublicVenue): Restaurant {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    phone: v.phone,
    address: v.address ?? undefined,
    city: v.city,
    cuisine: v.cuisine || '',
    whatsapp: v.whatsapp ?? undefined,
    mapsLink: v.mapsLink ?? undefined,
    emoji: v.emoji || '🍽️',
    logoImage: v.logoImage || '',
    coverImage: v.coverImage || '',
    isOpen: v.isOpen,
    opensAt: v.opensAt ?? undefined,
    closesAt: v.closesAt ?? undefined,
    currency: v.currency || 'INR',
    gstRatePct: v.gstRatePct ?? 5,
    industryId: (v.industryId as Restaurant['industryId']) || 'restaurants',
    ownerName: '',
    ownerEmail: '',
    planId: 'basic',
    status: 'active',
    mrr: 0,
    rating: 0,
    createdAt: '',
  }
}

function mapTable(t: PublicTable): DiningTable {
  return {
    id: t.id,
    name: t.name,
    number: t.number,
    seats: t.seats,
    status: (t.status as DiningTable['status']) || 'free',
    zone: (t.zone as DiningTable['zone']) || 'Main hall',
  }
}

/** Guest QR — load venue + optional table from public API only. */
export function useGuestVenue(restaurantId: string, tableId = '') {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [table, setTable] = useState<DiningTable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!restaurantId) {
      setRestaurant(null)
      setTable(null)
      setLoading(false)
      setError(true)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    void (async () => {
      try {
        const venue = await apiPublicVenue(restaurantId)
        if (cancelled) return
        if (venue.settings) hydrateFromTenantSettings(restaurantId, venue.settings)
        setRestaurant(mapVenue(venue))
        if (tableId) {
          try {
            const t = await apiPublicTable(restaurantId, tableId)
            if (!cancelled) setTable(mapTable(t))
          } catch {
            if (!cancelled) {
              setTable(null)
              setError(true)
            }
          }
        } else {
          if (!cancelled) setTable(null)
        }
        if (!cancelled) setLoading(false)
      } catch {
        if (!cancelled) {
          setRestaurant(null)
          setTable(null)
          setError(true)
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [restaurantId, tableId])

  return { restaurant, table, loading, error }
}
