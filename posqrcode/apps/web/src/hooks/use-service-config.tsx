import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiUpdateTenant } from '@/lib/api-tenants'
import { getAccessToken } from '@/lib/api-client'
import {
  DEFAULT_SERVICE_CONFIG,
  SERVICE_CONFIG_STORAGE_KEY,
  mergeServiceConfig,
  serviceConfigFromIndustry,
  type ServiceConfig,
} from '@/lib/service-config'
import type { IndustryId } from '@/lib/industries'
import { useMockData } from '@/lib/runtime-config'
import type { OrderType } from '@/lib/types'
import {
  readVenueScoped,
  resolveDataVenueId,
  subscribeVenueScope,
  venueKey,
  writeVenueScoped,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'

export const SERVICE_CONFIG_EVENT = 'bearqr:service-config-changed'

interface ServiceConfigContextValue {
  config: ServiceConfig
  /** Enabled order types in canonical order. */
  enabledOrderTypes: OrderType[]
  setOrderTypeEnabled: (type: OrderType, enabled: boolean) => void
  setDeliveryFee: (fee: number) => void
  /** Turn the table-free counter QR (/r/:restaurantId) on or off. */
  setCounterOrdering: (enabled: boolean) => void
  setDeductStockOnPaid: (enabled: boolean) => void
  /** Apply industry pack order-types + counter QR defaults. */
  applyIndustryDefaults: (industryId: IndustryId | string) => void
  reset: () => void
}

const ServiceConfigContext = createContext<ServiceConfigContextValue | null>(null)

function readStored(venueId = resolveDataVenueId()): ServiceConfig {
  const raw = readVenueScoped<ServiceConfig | null>(
    SERVICE_CONFIG_STORAGE_KEY,
    venueId,
    null,
  )
  return raw ? mergeServiceConfig(raw) : DEFAULT_SERVICE_CONFIG
}

function writeStored(venueId: string, config: ServiceConfig): void {
  writeVenueScoped(SERVICE_CONFIG_STORAGE_KEY, venueId, config)
  try {
    window.dispatchEvent(new Event(SERVICE_CONFIG_EVENT))
  } catch {
    /* ignore */
  }
}

const ORDER: OrderType[] = ['dine-in', 'takeaway', 'delivery']

export function ServiceConfigProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [config, setConfig] = useState<ServiceConfig>(() => readStored())

  const persistApi = useCallback(
    (next: ServiceConfig) => {
      if (mock || !getAccessToken()) return
      void apiUpdateTenant(venueId, {
        settings: {
          serviceConfig: next,
          orderTypes: next.orderTypes,
          counterOrdering: next.counterOrdering,
          deliveryFee: next.deliveryFee,
        },
      }).catch((err) => reportApiError(err))
    },
    [mock, venueId],
  )

  useEffect(
    () =>
      subscribeVenueScope(() => {
        const next = resolveDataVenueId()
        setVenueId(next)
        setConfig(readStored(next))
      }),
    [],
  )

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === venueKey(SERVICE_CONFIG_STORAGE_KEY, venueId) ||
        e.key === SERVICE_CONFIG_STORAGE_KEY ||
        e.key === null
      ) {
        setConfig(readStored(venueId))
      }
    }
    const onLocal = () => setConfig(readStored(venueId))
    window.addEventListener('storage', onStorage)
    window.addEventListener(SERVICE_CONFIG_EVENT, onLocal)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(SERVICE_CONFIG_EVENT, onLocal)
    }
  }, [venueId])

  const setOrderTypeEnabled = useCallback(
    (type: OrderType, enabled: boolean) => {
      setConfig((prev) => {
        const next = { ...prev, orderTypes: { ...prev.orderTypes, [type]: enabled } }
        writeStored(venueId, next)
        persistApi(next)
        return next
      })
    },
    [venueId, persistApi],
  )

  const setDeliveryFee = useCallback(
    (fee: number) => {
      setConfig((prev) => {
        const next = { ...prev, deliveryFee: Math.max(0, fee) }
        writeStored(venueId, next)
        persistApi(next)
        return next
      })
    },
    [venueId, persistApi],
  )

  const setCounterOrdering = useCallback(
    (enabled: boolean) => {
      setConfig((prev) => {
        const next = { ...prev, counterOrdering: enabled }
        writeStored(venueId, next)
        persistApi(next)
        return next
      })
    },
    [venueId, persistApi],
  )

  const setDeductStockOnPaid = useCallback(
    (enabled: boolean) => {
      setConfig((prev) => {
        const next = { ...prev, deductStockOnPaid: enabled }
        writeStored(venueId, next)
        persistApi(next)
        return next
      })
    },
    [venueId, persistApi],
  )

  const applyIndustryDefaults = useCallback(
    (industryId: IndustryId | string) => {
      setConfig((prev) => {
        const next = serviceConfigFromIndustry(industryId, prev)
        writeStored(venueId, next)
        persistApi(next)
        return next
      })
    },
    [venueId, persistApi],
  )

  const reset = useCallback(() => {
    writeStored(venueId, DEFAULT_SERVICE_CONFIG)
    persistApi(DEFAULT_SERVICE_CONFIG)
    setConfig(DEFAULT_SERVICE_CONFIG)
  }, [venueId, persistApi])

  const enabledOrderTypes = ORDER.filter((t) => config.orderTypes[t])

  return (
    <ServiceConfigContext.Provider
      value={{
        config,
        enabledOrderTypes,
        setOrderTypeEnabled,
        setDeliveryFee,
        setCounterOrdering,
        setDeductStockOnPaid,
        applyIndustryDefaults,
        reset,
      }}
    >
      {children}
    </ServiceConfigContext.Provider>
  )
}

export function useServiceConfig(): ServiceConfigContextValue {
  const ctx = useContext(ServiceConfigContext)
  if (!ctx) throw new Error('useServiceConfig must be used within <ServiceConfigProvider>')
  return ctx
}
