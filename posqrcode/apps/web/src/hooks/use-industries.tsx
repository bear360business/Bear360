import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isSuperAdmin } from '@/lib/auth'
import { apiGetPlatformConfig, apiPutPlatformConfig } from '@/lib/api-platform'
import {
  getIndustriesWithIcons,
  mergeIndustriesCatalog,
  syncIndustriesCatalog,
  INDUSTRIES_STORAGE_KEY,
} from '@/lib/industries-catalog'
import { defaultIndustryProfiles, type IndustryId, type IndustryProfile } from '@/lib/industries'
import { useMockData } from '@/lib/runtime-config'
import { reportApiError } from '@/lib/api-error'

interface IndustriesContextValue {
  profiles: IndustryProfile[]
  update: (id: IndustryId, patch: Partial<IndustryProfile>) => void
  reset: () => void
}

const IndustriesContext = createContext<IndustriesContextValue | null>(null)

function readStored(): IndustryProfile[] {
  try {
    const raw = localStorage.getItem(INDUSTRIES_STORAGE_KEY)
    return raw ? mergeIndustriesCatalog(JSON.parse(raw)) : defaultIndustryProfiles()
  } catch {
    return defaultIndustryProfiles()
  }
}

function writeStored(profiles: IndustryProfile[]) {
  try {
    localStorage.setItem(INDUSTRIES_STORAGE_KEY, JSON.stringify(profiles))
  } catch {
    /* ignore */
  }
}

export function IndustriesProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const apiReady = useRef(mock)
  const [profiles, setProfiles] = useState<IndustryProfile[]>(() => {
    const initial = readStored()
    syncIndustriesCatalog(initial)
    return initial
  })

  useEffect(() => {
    writeStored(profiles)
    syncIndustriesCatalog(profiles)
    if (!mock && apiReady.current && isSuperAdmin()) {
      void apiPutPlatformConfig({ industries: profiles }).catch((err) => reportApiError(err))
    }
  }, [profiles, mock])

  useEffect(() => {
    if (mock || !isSuperAdmin()) {
      apiReady.current = true
      return
    }
    let cancelled = false
    void apiGetPlatformConfig()
      .then((cfg) => {
        if (cancelled) return
        if (Array.isArray(cfg.industries)) {
          const next = mergeIndustriesCatalog(cfg.industries)
          syncIndustriesCatalog(next)
          writeStored(next)
          setProfiles(next)
        }
      })
      .catch((err) => reportApiError(err))
      .finally(() => {
        if (!cancelled) apiReady.current = true
      })
    return () => {
      cancelled = true
    }
  }, [mock])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === INDUSTRIES_STORAGE_KEY || e.key === null) {
        const next = readStored()
        syncIndustriesCatalog(next)
        setProfiles(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback((id: IndustryId, patch: Partial<IndustryProfile>) => {
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        return {
          ...p,
          ...patch,
          id: p.id,
          featureDefaults: { ...p.featureDefaults, ...patch.featureDefaults },
          serviceDefaults: {
            ...p.serviceDefaults,
            ...patch.serviceDefaults,
            orderTypes: {
              ...p.serviceDefaults.orderTypes,
              ...patch.serviceDefaults?.orderTypes,
            },
          },
          labels: { ...p.labels, ...patch.labels },
          navHints: {
            hide: patch.navHints?.hide ?? p.navHints.hide,
          },
        }
      }),
    )
  }, [])

  const reset = useCallback(() => {
    const next = defaultIndustryProfiles()
    writeStored(next)
    syncIndustriesCatalog(next)
    setProfiles(next)
  }, [])

  const value = useMemo(
    () => ({ profiles, update, reset }),
    [profiles, update, reset],
  )

  return <IndustriesContext.Provider value={value}>{children}</IndustriesContext.Provider>
}

export function useIndustries(): IndustriesContextValue {
  const ctx = useContext(IndustriesContext)
  if (!ctx) throw new Error('useIndustries must be used within an <IndustriesProvider>')
  return ctx
}

/** Marketing / picker list with Lucide icons from the live catalog. */
export function useIndustryOptions() {
  const { profiles } = useIndustries()
  return useMemo(() => getIndustriesWithIcons(), [profiles])
}
