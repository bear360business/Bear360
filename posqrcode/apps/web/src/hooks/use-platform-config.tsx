import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getAccessToken } from '@/lib/api-client'
import { AUTH_EVENT, isSuperAdmin } from '@/lib/auth'
import {
  apiGetPlatformConfig,
  apiGetPublicPlatformUi,
  apiPutPlatformConfig,
} from '@/lib/api-platform'
import {
  DEFAULT_PLATFORM_CONFIG,
  PLATFORM_CONFIG_STORAGE_KEY,
  mergePlatformConfig,
  type PlatformConfig,
  type MenuFlags,
  type CustomMenuItem,
} from '@/lib/platform-config'
import { useMockData } from '@/lib/runtime-config'
import { reportApiError } from '@/lib/api-error'

interface PlatformConfigContextValue {
  config: PlatformConfig
  /** Flip one flag — persists and applies immediately (all portals, all tabs). */
  setFlag: <S extends keyof PlatformConfig, K extends keyof PlatformConfig[S]>(
    section: S,
    key: K,
    value: boolean,
  ) => void
  setMenusFlag: (key: keyof MenuFlags, value: boolean) => void
  setCustomMenus: (value: CustomMenuItem[]) => void
  reset: () => void
}

const PlatformConfigContext = createContext<PlatformConfigContextValue | null>(null)

function readStored(): PlatformConfig {
  try {
    const raw = localStorage.getItem(PLATFORM_CONFIG_STORAGE_KEY)
    return raw ? mergePlatformConfig(JSON.parse(raw)) : DEFAULT_PLATFORM_CONFIG
  } catch {
    return DEFAULT_PLATFORM_CONFIG
  }
}

function writeStored(config: PlatformConfig): void {
  try {
    localStorage.setItem(PLATFORM_CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // storage unavailable — flags just won't persist
  }
}

export function PlatformConfigProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const [config, setConfig] = useState<PlatformConfig>(() => readStored())

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PLATFORM_CONFIG_STORAGE_KEY || e.key === null) setConfig(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (mock) return
    let cancelled = false
    const load = async () => {
      try {
        const token = getAccessToken()
        if (token && isSuperAdmin()) {
          try {
            const flags = await apiGetPlatformConfig()
            if (cancelled) return
            if (flags?.platformUi) {
              const next = mergePlatformConfig(flags.platformUi)
              writeStored(next)
              setConfig(next)
              return
            }
          } catch {
            // failed super admin config fetch, fallback to public ui
          }
        }
        const ui = await apiGetPublicPlatformUi()
        if (cancelled) return
        const next = mergePlatformConfig(ui)
        writeStored(next)
        setConfig(next)
      } catch {
        /* keep local defaults */
      }
    }
    void load()
    window.addEventListener(AUTH_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(AUTH_EVENT, load)
    }
  }, [mock])

  const setFlag = useCallback(
    <S extends keyof PlatformConfig, K extends keyof PlatformConfig[S]>(
      section: S,
      key: K,
      value: boolean,
    ) => {
      setConfig((prev) => {
        const next = { ...prev, [section]: { ...prev[section], [key]: value } }
        writeStored(next)
        if (!mock && isSuperAdmin()) {
          void apiPutPlatformConfig({ platformUi: next }).catch((err) => reportApiError(err))
        }
        return next
      })
    },
    [mock],
  )

  const setMenusFlag = useCallback(
    (key: keyof MenuFlags, value: boolean) => {
      setConfig((prev) => {
        const next = { ...prev, menus: { ...prev.menus, [key]: value } }
        writeStored(next)
        if (!mock && isSuperAdmin()) {
          void apiPutPlatformConfig({ platformUi: next }).catch((err) => reportApiError(err))
        }
        return next
      })
    },
    [mock],
  )

  const setCustomMenus = useCallback(
    (value: CustomMenuItem[]) => {
      setConfig((prev) => {
        const next = { ...prev, customMenus: value }
        writeStored(next)
        if (!mock && isSuperAdmin()) {
          void apiPutPlatformConfig({ platformUi: next }).catch((err) => reportApiError(err))
        }
        return next
      })
    },
    [mock],
  )

  const reset = useCallback(() => {
    writeStored(DEFAULT_PLATFORM_CONFIG)
    setConfig(DEFAULT_PLATFORM_CONFIG)
    if (!mock && isSuperAdmin()) {
      void apiPutPlatformConfig({ platformUi: DEFAULT_PLATFORM_CONFIG }).catch((err) => reportApiError(err))
    }
  }, [mock])

  return (
    <PlatformConfigContext.Provider value={{ config, setFlag, setMenusFlag, setCustomMenus, reset }}>
      {children}
    </PlatformConfigContext.Provider>
  )
}

export function usePlatformConfig(): PlatformConfigContextValue {
  const ctx = useContext(PlatformConfigContext)
  if (!ctx) throw new Error('usePlatformConfig must be used within <PlatformConfigProvider>')
  return ctx
}
