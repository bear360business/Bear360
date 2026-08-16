import { useCallback, useEffect, useState } from 'react'
import { useServiceConfig } from '@/hooks/use-service-config'
import { apiGetTenant, apiUpdateTenant } from '@/lib/api-tenants'
import { getAccessToken } from '@/lib/api-client'
import { hydrateFromTenantSettings } from '@/lib/hydrate-tenant-settings'
import {
  GUEST_LOCALES,
  normalizeDefaultLocale,
  normalizeEnabledLocales,
  type GuestLocale,
} from '@/lib/i18n'
import { useMockData } from '@/lib/runtime-config'
import {
  readVenueScoped,
  resolveDataVenueId,
  subscribeVenueScope,
  venueKey,
  writeVenueScoped,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

export const VENUE_OPS_KEY = 'bearqr:venue-ops'
export const VENUE_OPS_EVENT = 'bearqr:venue-ops-changed'

function notifyVenueOpsChanged() {
  try {
    window.dispatchEvent(new Event(VENUE_OPS_EVENT))
  } catch {
    /* ignore */
  }
}

export type VenueOps = {
  parcelCharge: number
  whatsappCheckout: boolean
  roomService: boolean
  onlinePayments: boolean
  cashOnDelivery: boolean
  cashDineIn: boolean
  cashPickup: boolean
  taxEnabled: boolean
  customerName: 'required' | 'optional' | 'hidden'
  customerPhone: 'required' | 'optional' | 'hidden'
  specialInstructions: boolean
  catalogueMode: boolean
  customerLogin: boolean
  /** Guest QR languages the venue offers. */
  enabledLocales: GuestLocale[]
  /** Default guest language (must be in enabledLocales). */
  defaultLocale: GuestLocale
}

const DEFAULT: VenueOps = {
  parcelCharge: 0,
  whatsappCheckout: false,
  roomService: false,
  onlinePayments: false,
  cashOnDelivery: true,
  cashDineIn: true,
  cashPickup: true,
  taxEnabled: true,
  customerName: 'required',
  customerPhone: 'required',
  specialInstructions: true,
  catalogueMode: false,
  customerLogin: false,
  enabledLocales: [...GUEST_LOCALES],
  defaultLocale: 'en',
}

function mergeOps(raw: Partial<VenueOps> | VenueOps): VenueOps {
  const enabledLocales = normalizeEnabledLocales(raw.enabledLocales)
  return {
    ...DEFAULT,
    ...raw,
    enabledLocales,
    defaultLocale: normalizeDefaultLocale(raw.defaultLocale, enabledLocales),
  }
}

function read(venueId = resolveDataVenueId()): VenueOps {
  return mergeOps(readVenueScoped(VENUE_OPS_KEY, venueId, DEFAULT))
}

/** Sync read for cart / customer menu (no React). */
export function getVenueOps(): VenueOps {
  return read()
}

export function useVenueOps() {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [ops, setOps] = useState<VenueOps>(() => read())
  const service = useServiceConfig()

  useEffect(() => {
    writeVenueScoped(VENUE_OPS_KEY, venueId, ops)
    notifyVenueOpsChanged()
  }, [ops, venueId])

  useEffect(
    () =>
      subscribeVenueScope(() => {
        const next = resolveDataVenueId()
        setVenueId(next)
        setOps(read(next))
      }),
    [],
  )

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void apiGetTenant(venueId)
      .then((row) => {
        if (cancelled || !row.settings) return
        hydrateFromTenantSettings(venueId, row.settings)
        setOps(read(venueId))
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  useEffect(() => {
    const sync = () => setOps(read(venueId))
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === venueKey(VENUE_OPS_KEY, venueId) ||
        e.key === VENUE_OPS_KEY ||
        e.key === null
      ) {
        sync()
      }
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(VENUE_OPS_EVENT, sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(VENUE_OPS_EVENT, sync)
    }
  }, [venueId])

  const patch = useCallback(
    (p: Partial<VenueOps>) => {
      setOps((o) => {
        const next = { ...o, ...p }
        const enabledLocales = normalizeEnabledLocales(next.enabledLocales)
        const merged = {
          ...next,
          enabledLocales,
          defaultLocale: normalizeDefaultLocale(next.defaultLocale, enabledLocales),
        }
        if (!mock) {
          void apiUpdateTenant(venueId, { settings: { venueOps: merged } }).catch((err) => reportApiError(err))
        }
        return merged
      })
    },
    [mock, venueId],
  )

  const setFulfillment = useCallback(
    (type: 'dine-in' | 'takeaway' | 'delivery', enabled: boolean) => {
      service.setOrderTypeEnabled(type, enabled)
      // Counter QR is the guest path for takeaway/delivery — keep it in sync.
      const takeaway =
        type === 'takeaway' ? enabled : service.config.orderTypes.takeaway
      const delivery =
        type === 'delivery' ? enabled : service.config.orderTypes.delivery
      if (takeaway || delivery) {
        if (!service.config.counterOrdering) service.setCounterOrdering(true)
      } else if (type === 'takeaway' || type === 'delivery') {
        service.setCounterOrdering(false)
      }
    },
    [service],
  )

  return { ops, patch, setFulfillment, service: service.config }
}
