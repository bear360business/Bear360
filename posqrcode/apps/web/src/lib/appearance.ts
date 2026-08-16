// Admin-selectable appearance: color theme + sidebar style.
// Themes are CSS-variable overrides (see globals.css [data-theme=…] blocks).

import { normalizeHex } from '@/lib/color'

export type ThemeId = 'bearqr' | 'amber' | 'butter' | 'berry'
export type SidebarStyle = 'dark' | 'light'
export type NavLayout = 'sidebar' | 'floating' | 'topbar'
export type Mode = 'light' | 'dark'
export type FontStyleId = 'inter' | 'dm-sans' | 'space' | 'syne' | 'manrope' | 'serif'

/** Optional chrome overrides — null / missing = use theme + rail style. */
export interface ChromeColors {
  navbar: string | null
  sidebar: string | null
  icons: string | null
  /** Body / heading text colour. */
  text: string | null
  /** Page / main layout background. */
  layout: string | null
}

export interface Appearance {
  theme: ThemeId
  sidebarStyle: SidebarStyle
  /** Admin shell navigation layout. */
  navLayout: NavLayout
  /** Light/dark mode — applies to every portal. */
  mode: Mode
  /** Custom colours for navbar, sidebar, icons, text, layout. */
  colors: ChromeColors
  /** App UI font stack. */
  fontStyle: FontStyleId
}

export const DEFAULT_CHROME_COLORS: ChromeColors = {
  navbar: null,
  sidebar: null,
  icons: null,
  text: null,
  layout: null,
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'bearqr',
  sidebarStyle: 'dark',
  navLayout: 'sidebar',
  mode: 'light',
  colors: { ...DEFAULT_CHROME_COLORS },
  fontStyle: 'inter',
}

/** Fallback swatches shown in the picker when no custom colour is set. */
export const CHROME_FALLBACKS = {
  navbar: '#ffffff',
  sidebarDark: '#0f172a',
  sidebarLight: '#ffffff',
  iconsDark: '#94a3b8',
  iconsLight: '#64748b',
  textLight: '#0f172a',
  textDark: '#f1f5f9',
  layoutLight: '#f8fafc',
  layoutDark: '#12151a',
} as const

export const APPEARANCE_STORAGE_KEY = 'bearqr:appearance'

/** Picker metadata — static swatch hexes for the settings UI only. */
export const THEMES: { id: ThemeId; name: string; caption: string; brand: string; ink: string }[] = [
  { id: 'bearqr', name: 'Bear 360 Green', caption: 'SaaS green + slate ink', brand: '#16A34A', ink: '#0F172A' },
  { id: 'amber', name: 'Bear 360 Yellow', caption: 'The original signature yellow', brand: '#F9EE4F', ink: '#0B0807' },
  { id: 'butter', name: 'Butter', caption: 'Warm butter + cocoa brown', brand: '#F2CD68', ink: '#241708' },
  { id: 'berry', name: 'Berry Punch', caption: 'Punchy orange + berry ink', brand: '#EA6B3D', ink: '#290A1B' },
]

/** Navigation layout presets for the admin shell (picker metadata). */
export const NAV_LAYOUTS: { id: NavLayout; name: string; caption: string }[] = [
  { id: 'sidebar', name: 'Classic rail', caption: 'Fixed sidebar — bold, KFC-style' },
  { id: 'floating', name: 'Floating rail', caption: 'Detached rounded rail — Airbnb vibes' },
  { id: 'topbar', name: 'Top bar', caption: 'Horizontal navbar — Uber style' },
]

export const FONT_STYLES: {
  id: FontStyleId
  name: string
  caption: string
  /** CSS font-family for body/UI */
  sans: string
  /** CSS font-family for headings */
  display: string
  sample: string
}[] = [
  {
    id: 'inter',
    name: 'Inter',
    caption: 'Clean SaaS default',
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
    display: '"Space Grotesk", Inter, sans-serif',
    sample: 'Aa',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    caption: 'Friendly & rounded',
    sans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    display: '"DM Sans", sans-serif',
    sample: 'Aa',
  },
  {
    id: 'space',
    name: 'Space Grotesk',
    caption: 'Geometric & bold',
    sans: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    display: '"Space Grotesk", sans-serif',
    sample: 'Aa',
  },
  {
    id: 'syne',
    name: 'Syne',
    caption: 'Expressive display',
    sans: 'Syne, "DM Sans", sans-serif',
    display: 'Syne, sans-serif',
    sample: 'Aa',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    caption: 'Modern product UI',
    sans: 'Manrope, ui-sans-serif, system-ui, sans-serif',
    display: 'Manrope, sans-serif',
    sample: 'Aa',
  },
  {
    id: 'serif',
    name: 'Source Serif',
    caption: 'Editorial & warm',
    sans: '"Source Serif 4", Georgia, serif',
    display: '"Source Serif 4", Georgia, serif',
    sample: 'Aa',
  },
]

function mergeChromeColors(raw: unknown): ChromeColors {
  const c = (raw ?? {}) as Partial<ChromeColors>
  const pick = (v: unknown) => {
    if (typeof v !== 'string') return null
    return normalizeHex(v)
  }
  return {
    navbar: pick(c.navbar),
    sidebar: pick(c.sidebar),
    icons: pick(c.icons),
    text: pick(c.text),
    layout: pick(c.layout),
  }
}

export function mergeAppearance(stored: unknown): Appearance {
  const s = (stored ?? {}) as Partial<Appearance>
  return {
    theme: THEMES.some((t) => t.id === s.theme) ? (s.theme as ThemeId) : DEFAULT_APPEARANCE.theme,
    sidebarStyle: s.sidebarStyle === 'light' ? 'light' : 'dark',
    navLayout: NAV_LAYOUTS.some((l) => l.id === s.navLayout)
      ? (s.navLayout as NavLayout)
      : DEFAULT_APPEARANCE.navLayout,
    mode: s.mode === 'dark' ? 'dark' : 'light',
    colors: mergeChromeColors(s.colors),
    fontStyle: FONT_STYLES.some((f) => f.id === s.fontStyle)
      ? (s.fontStyle as FontStyleId)
      : DEFAULT_APPEARANCE.fontStyle,
  }
}
