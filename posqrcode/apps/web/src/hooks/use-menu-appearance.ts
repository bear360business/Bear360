import { useCallback, useEffect, useState } from 'react'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import { apiUpdateTenant } from '@/lib/api-tenants'
import { useMockData } from '@/lib/runtime-config'
import {
  readVenueScoped,
  resolveDataVenueId,
  subscribeVenueScope,
  writeVenueScoped,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

export const MENU_APPEARANCE_KEY = 'bearqr:menu-appearance'

export type MenuThemeId =
  | 'clean-simple'
  | 'dark-luxury'
  | 'urban-feast'
  | 'quick-bite'
  | 'smart-order'
  | 'pizza-style'

export type MenuAppearance = {
  themeId: MenuThemeId
}

export const MENU_THEMES: {
  id: MenuThemeId
  name: string
  blurb: string
  /** Tailwind preview chips */
  preview: string
  locked?: boolean
}[] = [
  {
    id: 'clean-simple',
    name: 'Clean & Simple',
    blurb: 'Light cards, clear prices — default Bear 360 guest menu.',
    preview: 'bg-white border-line',
  },
  {
    id: 'dark-luxury',
    name: 'Dark Luxury',
    blurb: 'Dark surface with gold accents for fine dining.',
    preview: 'bg-ink-900 border-ink-800',
  },
  {
    id: 'urban-feast',
    name: 'Urban Feast',
    blurb: 'Image-forward cards and round category chips.',
    preview: 'bg-surface-muted border-line',
  },
  {
    id: 'quick-bite',
    name: 'Quick Bite',
    blurb: 'Search-first layout for cafes and QSR.',
    preview: 'bg-white border-info',
  },
  {
    id: 'smart-order',
    name: 'Smart Order',
    blurb: 'Green header with chatty cart feedback.',
    preview: 'bg-success-tint border-success',
  },
  {
    id: 'pizza-style',
    name: 'Hero Style',
    blurb: 'Large cover hero with circular categories.',
    preview: 'bg-warning-tint border-warning',
  },
]

const DEFAULT: MenuAppearance = { themeId: 'clean-simple' }

function normalize(parsed: MenuAppearance | null | undefined): MenuAppearance {
  if (!parsed || !MENU_THEMES.some((t) => t.id === parsed.themeId)) return DEFAULT
  return parsed
}

function read(venueId = resolveDataVenueId()): MenuAppearance {
  return normalize(readVenueScoped<MenuAppearance>(MENU_APPEARANCE_KEY, venueId, DEFAULT))
}

export function useMenuAppearance() {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [appearance, setAppearance] = useState<MenuAppearance>(() => read())

  useEffect(() => {
    writeVenueScoped(MENU_APPEARANCE_KEY, venueId, appearance)
  }, [appearance, venueId])

  useEffect(
    () =>
      subscribeVenueScope(() => {
        const next = resolveDataVenueId()
        setVenueId(next)
        setAppearance(read(next))
      }),
    [],
  )

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith(MENU_APPEARANCE_KEY) || e.key === null) setAppearance(read(venueId))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [venueId])

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void apiGetVenueData<MenuAppearance>(venueId, 'menuAppearance')
      .then((remote) => {
        if (cancelled) return
        const next = normalize(remote)
        writeVenueScoped(MENU_APPEARANCE_KEY, venueId, next)
        setAppearance(next)
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  const setTheme = useCallback(
    (themeId: MenuThemeId) => {
      const next = { themeId }
      setAppearance(next)
      writeVenueScoped(MENU_APPEARANCE_KEY, venueId, next)
      if (!mock && getAccessToken()) {
        void apiPutVenueData(venueId, 'menuAppearance', next).catch((err) => reportApiError(err))
        // Also settings so public guest hydrate picks it up without auth bag access.
        void apiUpdateTenant(venueId, { settings: { menuAppearance: next } }).catch((err) => reportApiError(err))
      }
    },
    [mock, venueId],
  )

  return { appearance, setTheme, themes: MENU_THEMES }
}

/** Sync read for customer menu (no React). */
export function getMenuAppearance(): MenuAppearance {
  return read()
}

/** Apply from tenant.settings (guest public venue). */
export function applyMenuAppearanceFromSettings(
  venueId: string,
  settings: Record<string, unknown> | undefined | null,
) {
  const raw = settings?.menuAppearance as MenuAppearance | undefined
  if (!raw) return
  const next = normalize(raw)
  writeVenueScoped(MENU_APPEARANCE_KEY, venueId, next)
}
