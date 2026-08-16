// Platform-level feature flags the Super Admin controls dynamically.
// Persisted to localStorage; every portal reads them live (see use-platform-config).

export interface ServiceFlags {
  /** Customers can place orders. Off = menus are browse-only everywhere. */
  onlineOrdering: boolean
  /** Kitchen display system for restaurant staff (sidebar item + /kitchen). */
  kitchenDisplay: boolean
}

export interface CustomerUiFlags {
  /** Dish photos on the customer menu. */
  showItemImages: boolean
  /** Veg/non-veg marks and 🌶 spice indicators. */
  showVegSpiceBadges: boolean
  /** ★ rating in the table-landing hero. */
  showRatings: boolean
  /** Live order tracker on the success screen. */
  showLiveTracking: boolean
  /** "Powered by Bear 360" branding on customer screens. */
  showPoweredBy: boolean
}

export interface AdminUiFlags {
  /** Reports section in the restaurant admin portal. */
  showReports: boolean
  /** Revenue stat card + sales chart on the admin dashboard. */
  showRevenueStats: boolean
  /** Recent-activity feed on the admin dashboard. */
  showActivityFeed: boolean
}

export interface PlatformConfig {
  service: ServiceFlags
  customerUi: CustomerUiFlags
  adminUi: AdminUiFlags
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  service: {
    onlineOrdering: true,
    kitchenDisplay: true,
  },
  customerUi: {
    showItemImages: true,
    showVegSpiceBadges: true,
    showRatings: true,
    showLiveTracking: true,
    showPoweredBy: true,
  },
  adminUi: {
    showReports: true,
    showRevenueStats: true,
    showActivityFeed: true,
  },
}

export const PLATFORM_CONFIG_STORAGE_KEY = 'bearqr:platform-config'

/** Merge a stored (possibly older/partial) config over the defaults. */
export function mergePlatformConfig(stored: unknown): PlatformConfig {
  const s = (stored ?? {}) as Partial<Record<keyof PlatformConfig, Record<string, boolean>>>
  return {
    service: { ...DEFAULT_PLATFORM_CONFIG.service, ...s.service },
    customerUi: { ...DEFAULT_PLATFORM_CONFIG.customerUi, ...s.customerUi },
    adminUi: { ...DEFAULT_PLATFORM_CONFIG.adminUi, ...s.adminUi },
  }
}
