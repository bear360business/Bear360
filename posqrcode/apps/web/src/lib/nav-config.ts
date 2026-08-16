// Admin-controlled side menu: which nav items the team sees, and in what order
// (Settings → Appearance → Side menu). This is the `tenantPref` layer of the
// grant model — the owner hiding a module from their own staff, not a plan gate
// (BEARQR_SAAS_UI_ARCHITECTURE.md §5.1).

export interface NavConfig {
  /** Route paths the owner has hidden from the menu. */
  hidden: string[]
  /** Explicit ordering by path; items not listed keep their natural order. */
  order: string[]
}

export const DEFAULT_NAV_CONFIG: NavConfig = { hidden: [], order: [] }

export const NAV_CONFIG_STORAGE_KEY = 'bearqr:nav-config'

/**
 * Never hideable — removing Settings would strand the owner with no way back,
 * and Dashboard is the shell's home.
 */
export const REQUIRED_NAV_PATHS = ['/dashboard', '/settings']

export function mergeNavConfig(stored: unknown): NavConfig {
  const s = (stored ?? {}) as Partial<NavConfig>
  const hidden = Array.isArray(s.hidden)
    ? s.hidden.filter((p): p is string => typeof p === 'string' && !REQUIRED_NAV_PATHS.includes(p))
    : []
  const order = Array.isArray(s.order) ? s.order.filter((p) => typeof p === 'string') : []
  return { hidden, order }
}

/** Sort key for a path: its index in the saved order, or +∞ when unsaved. */
export function orderIndex(config: NavConfig, path: string): number {
  const i = config.order.indexOf(path)
  return i === -1 ? Number.POSITIVE_INFINITY : i
}
