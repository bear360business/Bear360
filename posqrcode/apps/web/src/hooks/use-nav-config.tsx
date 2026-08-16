import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { NavSection } from '@/components/app/AppSidebar'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import {
  DEFAULT_NAV_CONFIG,
  NAV_CONFIG_STORAGE_KEY,
  REQUIRED_NAV_PATHS,
  mergeNavConfig,
  orderIndex,
  type NavConfig,
} from '@/lib/nav-config'
import { useMockData } from '@/lib/runtime-config'
import {
  resolveDataVenueId,
  subscribeVenueScope,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

interface NavConfigContextValue {
  config: NavConfig
  isHidden: (path: string) => boolean
  setHidden: (path: string, hidden: boolean) => void
  /** Move an item up/down inside its own section. */
  move: (sections: NavSection[], path: string, direction: -1 | 1) => void
  /** Apply hidden + order to a nav tree. */
  apply: (sections: NavSection[]) => NavSection[]
  reset: () => void
}

const NavConfigContext = createContext<NavConfigContextValue | null>(null)

function readStored(): NavConfig {
  try {
    const raw = localStorage.getItem(NAV_CONFIG_STORAGE_KEY)
    return raw ? mergeNavConfig(JSON.parse(raw)) : DEFAULT_NAV_CONFIG
  } catch {
    return DEFAULT_NAV_CONFIG
  }
}

function writeStored(config: NavConfig): void {
  try {
    localStorage.setItem(NAV_CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // storage unavailable — menu prefs just won't persist
  }
}

export function NavConfigProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [config, setConfig] = useState<NavConfig>(() => readStored())

  const persistApi = useCallback(
    (next: NavConfig) => {
      if (mock || !getAccessToken() || !venueId) return
      void apiPutVenueData(venueId, 'navConfig', next).catch((err) => reportApiError(err))
    },
    [mock, venueId],
  )

  useEffect(
    () =>
      subscribeVenueScope(() => {
        setVenueId(resolveDataVenueId())
      }),
    [],
  )

  useEffect(() => {
    if (mock || !getAccessToken() || !venueId) return
    let cancelled = false
    void apiGetVenueData<NavConfig>(venueId, 'navConfig')
      .then((row) => {
        if (cancelled || !row || typeof row !== 'object') return
        const next = mergeNavConfig(row)
        writeStored(next)
        setConfig(next)
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  // Live cross-tab sync — the menu updates in every open tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NAV_CONFIG_STORAGE_KEY || e.key === null) setConfig(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const commit = useCallback(
    (next: NavConfig) => {
      writeStored(next)
      persistApi(next)
      setConfig(next)
    },
    [persistApi],
  )

  const setHidden = useCallback(
    (path: string, hidden: boolean) => {
      if (REQUIRED_NAV_PATHS.includes(path)) return
      setConfig((prev) => {
        const next = {
          ...prev,
          hidden: hidden
            ? [...new Set([...prev.hidden, path])]
            : prev.hidden.filter((p) => p !== path),
        }
        writeStored(next)
        persistApi(next)
        return next
      })
    },
    [persistApi],
  )

  const move = useCallback(
    (sections: NavSection[], path: string, direction: -1 | 1) => {
      setConfig((prev) => {
        // Reorder only within the item's own section — cross-section moves would
        // put "Billing" under "Operations" and make the grouping meaningless.
        const section = sections.find((s) => s.items.some((i) => i.to === path))
        if (!section) return prev
        const paths = [...section.items]
          .sort((a, b) => orderIndex(prev, a.to) - orderIndex(prev, b.to))
          .map((i) => i.to)
        const from = paths.indexOf(path)
        const to = from + direction
        if (from === -1 || to < 0 || to >= paths.length) return prev
        paths.splice(to, 0, ...paths.splice(from, 1))

        // Rebuild a full ordering so every section stays stable.
        const order = sections.flatMap((s) =>
          s === section
            ? paths
            : [...s.items]
                .sort((a, b) => orderIndex(prev, a.to) - orderIndex(prev, b.to))
                .map((i) => i.to),
        )
        const next = { ...prev, order }
        writeStored(next)
        persistApi(next)
        return next
      })
    },
    [persistApi],
  )

  const apply = useCallback(
    (sections: NavSection[]) =>
      sections
        .map((section) => ({
          ...section,
          items: section.items
            .filter((item) => !config.hidden.includes(item.to))
            .sort((a, b) => orderIndex(config, a.to) - orderIndex(config, b.to)),
        }))
        .filter((section) => section.items.length > 0),
    [config],
  )

  const reset = useCallback(() => commit(DEFAULT_NAV_CONFIG), [commit])

  const value = useMemo<NavConfigContextValue>(
    () => ({
      config,
      isHidden: (path: string) => config.hidden.includes(path),
      setHidden,
      move,
      apply,
      reset,
    }),
    [config, setHidden, move, apply, reset],
  )

  return <NavConfigContext.Provider value={value}>{children}</NavConfigContext.Provider>
}

export function useNavConfig(): NavConfigContextValue {
  const ctx = useContext(NavConfigContext)
  if (!ctx) throw new Error('useNavConfig must be used within a <NavConfigProvider>')
  return ctx
}
