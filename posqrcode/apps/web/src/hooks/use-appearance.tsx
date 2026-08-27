import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  FONT_STYLES,
  mergeAppearance,
  type Appearance,
  type ChromeColors,
  type FontStyleId,
} from '@/lib/appearance'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import {
  adjustHslLightness,
  hexToHslComponents,
  isLightHex,
  normalizeHex,
} from '@/lib/color'
import { useMockData } from '@/lib/runtime-config'
import {
  resolveDataVenueId,
  subscribeVenueScope,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'
import { isStoreSetupPending } from '@/features/admin/onboarding/store-setup'

interface AppearanceContextValue {
  appearance: Appearance
  /** Update part of the appearance — applies + persists instantly. */
  setAppearance: (patch: Partial<Appearance>) => void
  /** Patch one chrome colour. Pass null to clear. */
  setChromeColor: (key: keyof ChromeColors, hex: string | null) => void
  setFontStyle: (id: FontStyleId) => void
  reset: () => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

const NAV_INLINE_KEYS = [
  '--nav-bg',
  '--nav-fg',
  '--nav-muted',
  '--nav-hover',
  '--nav-border',
  '--nav-active',
] as const

const CHROME_INLINE_KEYS = [
  '--chrome-navbar',
  '--chrome-sidebar',
  '--chrome-icon',
  '--chrome-text',
  '--chrome-layout',
  '--foreground',
  '--card-foreground',
  '--popover-foreground',
  '--muted-foreground',
  '--secondary-foreground',
  '--accent-foreground',
  '--ink-900',
  '--ink-800',
  '--ink-700',
  '--background',
  '--surface-page',
  '--font-sans',
  '--font-display',
] as const

function readStored(): Appearance {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY)
    return raw ? mergeAppearance(JSON.parse(raw)) : DEFAULT_APPEARANCE
  } catch {
    return DEFAULT_APPEARANCE
  }
}

function writeStored(appearance: Appearance): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance))
  } catch {
    // storage unavailable — appearance just won't persist
  }
}

function clearInlineChrome(root: HTMLElement) {
  ;[...CHROME_INLINE_KEYS, ...NAV_INLINE_KEYS].forEach((k) => root.style.removeProperty(k))
  root.style.removeProperty('font-family')
  root.removeAttribute('data-chrome-sidebar')
  root.removeAttribute('data-chrome-navbar')
  root.removeAttribute('data-chrome-icons')
  root.removeAttribute('data-chrome-text')
  root.removeAttribute('data-chrome-layout')
  root.removeAttribute('data-font')
  document.body?.style.removeProperty('font-family')
  document.body?.style.removeProperty('color')
}

function applyTextColor(root: HTMLElement, hex: string) {
  const hsl = hexToHslComponents(hex)
  if (!hsl) return
  root.style.setProperty('--chrome-text', hex)
  root.style.setProperty('--foreground', hsl)
  root.style.setProperty('--card-foreground', hsl)
  root.style.setProperty('--popover-foreground', hsl)
  root.style.setProperty('--secondary-foreground', hsl)
  root.style.setProperty('--accent-foreground', hsl)
  // Most admin UI uses ink-* instead of foreground — keep them in sync.
  root.style.setProperty('--ink-900', hsl)
  root.style.setProperty(
    '--ink-800',
    adjustHslLightness(hsl, isLightHex(hex) ? -8 : 8),
  )
  root.style.setProperty(
    '--ink-700',
    adjustHslLightness(hsl, isLightHex(hex) ? -16 : 16),
  )
  root.style.setProperty(
    '--muted-foreground',
    adjustHslLightness(hsl, isLightHex(hex) ? -22 : 28),
  )
  root.setAttribute('data-chrome-text', '1')
  document.body.style.color = hex
}

function applyFont(root: HTMLElement, appearance: Appearance) {
  const font = FONT_STYLES.find((f) => f.id === appearance.fontStyle) ?? FONT_STYLES[0]
  root.style.setProperty('--font-sans', font.sans)
  root.style.setProperty('--font-display', font.display)
  root.style.fontFamily = font.sans
  document.body.style.fontFamily = font.sans
  root.setAttribute('data-font', font.id)
}

function applyChrome(appearance: Appearance) {
  const root = document.documentElement
  clearInlineChrome(root)

  const { colors } = appearance

  if (colors.navbar) {
    const hex = normalizeHex(colors.navbar)
    if (hex) {
      root.style.setProperty('--chrome-navbar', hex)
      root.setAttribute('data-chrome-navbar', '1')
    }
  }

  if (colors.sidebar) {
    const hex = normalizeHex(colors.sidebar)
    const hsl = hex ? hexToHslComponents(hex) : null
    if (hex && hsl) {
      root.style.setProperty('--chrome-sidebar', hex)
      root.style.setProperty('--nav-bg', hsl)
      const light = isLightHex(hex)
      if (light) {
        root.style.setProperty('--nav-fg', '222 47% 11%')
        root.style.setProperty('--nav-muted', '215 16% 40%')
        root.style.setProperty('--nav-hover', '210 40% 96%')
        root.style.setProperty('--nav-border', '220 13% 88%')
        root.style.setProperty('--nav-active', '210 40% 96%')
      } else {
        root.style.setProperty('--nav-fg', '0 0% 100%')
        root.style.setProperty('--nav-muted', '0 0% 100% / 0.55')
        root.style.setProperty('--nav-hover', '0 0% 100% / 0.08')
        root.style.setProperty('--nav-border', '0 0% 100% / 0.1')
        root.style.setProperty('--nav-active', '0 0% 100% / 0.12')
      }
      root.setAttribute('data-chrome-sidebar', light ? 'light' : 'dark')
    }
  }

  if (colors.icons) {
    const hex = normalizeHex(colors.icons)
    if (hex) {
      root.style.setProperty('--chrome-icon', hex)
      root.setAttribute('data-chrome-icons', '1')
    }
  }

  if (colors.text) {
    const hex = normalizeHex(colors.text)
    if (hex) applyTextColor(root, hex)
  }

  if (colors.layout) {
    const hex = normalizeHex(colors.layout)
    const hsl = hex ? hexToHslComponents(hex) : null
    if (hex && hsl) {
      root.style.setProperty('--chrome-layout', hex)
      root.style.setProperty('--background', hsl)
      root.style.setProperty('--surface-page', hsl)
      root.setAttribute('data-chrome-layout', '1')
    }
  }

  applyFont(root, appearance)
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [appearance, setState] = useState<Appearance>(() => readStored())

  const persistApi = useCallback(
    (next: Appearance) => {
      if (mock || !getAccessToken() || !venueId) return
      void apiPutVenueData(venueId, 'appearance', next).catch((err) => reportApiError(err))
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
    if (mock || !getAccessToken() || !venueId || isStoreSetupPending()) return
    let cancelled = false
    void apiGetVenueData<Appearance>(venueId, 'appearance')
      .then((row) => {
        if (cancelled || !row || typeof row !== 'object') return
        const next = mergeAppearance(row)
        writeStored(next)
        setState(next)
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  // Theme + nav chrome + fonts → CSS variables on <html> restyle live.
  useEffect(() => {
    const root = document.documentElement
    if (appearance.theme === 'bearqr') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', appearance.theme)
    root.setAttribute('data-nav', appearance.sidebarStyle)
    root.classList.toggle('dark', appearance.mode === 'dark')
    applyChrome(appearance)
  }, [appearance])

  // Live cross-tab sync (same pattern as platform config).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === APPEARANCE_STORAGE_KEY || e.key === null) setState(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setAppearance = useCallback(
    (patch: Partial<Appearance>) => {
      setState((prev) => {
        const next: Appearance = {
          ...prev,
          ...patch,
          colors: patch.colors ? { ...prev.colors, ...patch.colors } : prev.colors,
        }
        writeStored(next)
        persistApi(next)
        return next
      })
    },
    [persistApi],
  )

  const setChromeColor = useCallback(
    (key: keyof ChromeColors, hex: string | null) => {
      setState((prev) => {
        const next: Appearance = {
          ...prev,
          colors: { ...prev.colors, [key]: hex ? normalizeHex(hex) : null },
        }
        writeStored(next)
        persistApi(next)
        return next
      })
    },
    [persistApi],
  )

  const setFontStyle = useCallback(
    (id: FontStyleId) => {
      setState((prev) => {
        const next: Appearance = { ...prev, fontStyle: id }
        writeStored(next)
        persistApi(next)
        return next
      })
    },
    [persistApi],
  )

  const reset = useCallback(() => {
    const next = { ...DEFAULT_APPEARANCE, colors: { ...DEFAULT_APPEARANCE.colors } }
    writeStored(next)
    persistApi(next)
    setState(next)
  }, [persistApi])

  return (
    <AppearanceContext.Provider
      value={{ appearance, setAppearance, setChromeColor, setFontStyle, reset }}
    >
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used within <AppearanceProvider>')
  return ctx
}
