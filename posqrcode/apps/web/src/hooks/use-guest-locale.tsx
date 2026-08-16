import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getVenueOps, VENUE_OPS_EVENT, VENUE_OPS_KEY } from '@/hooks/use-venue-ops'
import {
  LOCALE_META,
  normalizeDefaultLocale,
  normalizeEnabledLocales,
  t,
  type GuestLocale,
  type MessageKey,
  type TParams,
} from '@/lib/i18n'
import { venueKey } from '@/lib/venue-scope'

const GUEST_LOCALE_KEY = 'bearqr:guest-locale'
const GUEST_LOCALE_EVENT = 'bearqr:guest-locale-changed'

type GuestLocaleContextValue = {
  locale: GuestLocale
  enabledLocales: GuestLocale[]
  setLocale: (locale: GuestLocale) => void
  t: (key: MessageKey, params?: TParams) => string
}

const GuestLocaleContext = createContext<GuestLocaleContextValue | null>(null)

function storageKey(restaurantId: string) {
  return `${GUEST_LOCALE_KEY}:${restaurantId}`
}

function readStoredPick(restaurantId: string): GuestLocale | null {
  try {
    const raw = localStorage.getItem(storageKey(restaurantId))
    if (raw === 'en' || raw === 'ta' || raw === 'hi') return raw
  } catch {
    /* ignore */
  }
  return null
}

function resolveLocale(restaurantId: string): {
  locale: GuestLocale
  enabledLocales: GuestLocale[]
} {
  const ops = getVenueOps()
  const enabledLocales = normalizeEnabledLocales(ops.enabledLocales)
  const defaultLocale = normalizeDefaultLocale(ops.defaultLocale, enabledLocales)
  const pick = readStoredPick(restaurantId)
  const locale =
    pick && enabledLocales.includes(pick) ? pick : defaultLocale
  return { locale, enabledLocales }
}

export function GuestLocaleProvider({
  restaurantId,
  children,
}: {
  restaurantId: string
  children: ReactNode
}) {
  const [{ locale, enabledLocales }, setState] = useState(() =>
    resolveLocale(restaurantId),
  )

  useEffect(() => {
    setState(resolveLocale(restaurantId))
  }, [restaurantId])

  useEffect(() => {
    const sync = () => setState(resolveLocale(restaurantId))
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === storageKey(restaurantId) ||
        e.key === venueKey(VENUE_OPS_KEY, restaurantId) ||
        e.key === VENUE_OPS_KEY ||
        e.key === null
      ) {
        sync()
      }
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(VENUE_OPS_EVENT, sync)
    window.addEventListener(GUEST_LOCALE_EVENT, sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(VENUE_OPS_EVENT, sync)
      window.removeEventListener(GUEST_LOCALE_EVENT, sync)
    }
  }, [restaurantId])

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale].htmlLang
  }, [locale])

  const setLocale = useCallback(
    (next: GuestLocale) => {
      const { enabledLocales: enabled } = resolveLocale(restaurantId)
      if (!enabled.includes(next)) return
      try {
        localStorage.setItem(storageKey(restaurantId), next)
      } catch {
        /* ignore */
      }
      setState({ locale: next, enabledLocales: enabled })
      try {
        window.dispatchEvent(new Event(GUEST_LOCALE_EVENT))
      } catch {
        /* ignore */
      }
    },
    [restaurantId],
  )

  const translate = useCallback(
    (key: MessageKey, params?: TParams) => t(key, locale, params),
    [locale],
  )

  const value = useMemo(
    () => ({
      locale,
      enabledLocales,
      setLocale,
      t: translate,
    }),
    [locale, enabledLocales, setLocale, translate],
  )

  return (
    <GuestLocaleContext.Provider value={value}>{children}</GuestLocaleContext.Provider>
  )
}

export function useGuestLocale(): GuestLocaleContextValue {
  const ctx = useContext(GuestLocaleContext)
  if (!ctx) {
    // Fallback outside provider (admin pages shouldn't need this).
    return {
      locale: 'en',
      enabledLocales: ['en'],
      setLocale: () => undefined,
      t: (key, params) => t(key, 'en', params),
    }
  }
  return ctx
}

export function GuestLocaleSwitcher({
  className,
  variant = 'dark',
}: {
  className?: string
  variant?: 'dark' | 'light'
}) {
  const { locale, enabledLocales, setLocale, t: tr } = useGuestLocale()
  if (enabledLocales.length <= 1) return null

  const dark = variant === 'dark'

  return (
    <div
      className={className}
      role="group"
      aria-label={tr('lang.label')}
    >
      <div
        className={
          dark
            ? 'inline-flex rounded-full bg-white/10 p-0.5 ring-1 ring-white/15 backdrop-blur-sm'
            : 'inline-flex rounded-full bg-surface-muted p-0.5 ring-1 ring-line'
        }
      >
        {enabledLocales.map((code) => {
          const on = code === locale
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={
                on
                  ? dark
                    ? 'rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-900'
                    : 'rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm'
                  : dark
                    ? 'rounded-full px-2.5 py-1 text-[11px] font-medium text-white/75 hover:text-white'
                    : 'rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground'
              }
            >
              {LOCALE_META[code].nativeLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}
