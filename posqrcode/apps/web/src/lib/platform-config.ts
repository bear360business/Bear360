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

export type MenuKey =
  | 'dashboard'
  | 'tables'
  | 'menu'
  | 'orders'
  | 'integrations'
  | 'pos'
  | 'kitchen'
  | 'qrDesigner'
  | 'inventory'
  | 'staff'
  | 'orderingCheckout'
  | 'customers'
  | 'aiInsights'
  | 'shop'
  | 'storeProfile'
  | 'support'
  | 'billing'
  | 'settings'

export interface MenuFlags {
  dashboard: boolean
  tables: boolean
  menu: boolean
  orders: boolean
  integrations: boolean
  pos: boolean
  kitchen: boolean
  qrDesigner: boolean
  inventory: boolean
  staff: boolean
  orderingCheckout: boolean
  customers: boolean
  aiInsights: boolean
  shop: boolean
  storeProfile: boolean
  support: boolean
  billing: boolean
  settings: boolean
}

export interface CustomMenuItem {
  id: string
  label: string
  to: string
  icon: string
  enabled: boolean
}

export interface PlatformConfig {
  service: ServiceFlags
  customerUi: CustomerUiFlags
  adminUi: AdminUiFlags
  menus: MenuFlags
  customMenus: CustomMenuItem[]
}

export const DEFAULT_MENU_FLAGS: MenuFlags = {
  dashboard: true,
  tables: true,
  menu: true,
  orders: true,
  integrations: true,
  pos: true,
  kitchen: true,
  qrDesigner: true,
  inventory: true,
  staff: true,
  orderingCheckout: true,
  customers: true,
  aiInsights: true,
  shop: true,
  storeProfile: true,
  support: true,
  billing: true,
  settings: true,
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
  menus: DEFAULT_MENU_FLAGS,
  customMenus: [],
}

export const PLATFORM_CONFIG_STORAGE_KEY = 'bearqr:platform-config'

/** Merge a stored (possibly older/partial) config over the defaults. */
export function mergePlatformConfig(stored: unknown): PlatformConfig {
  const s = (stored ?? {}) as Partial<Record<keyof PlatformConfig, any>>
  return {
    service: { ...DEFAULT_PLATFORM_CONFIG.service, ...s.service },
    customerUi: { ...DEFAULT_PLATFORM_CONFIG.customerUi, ...s.customerUi },
    adminUi: { ...DEFAULT_PLATFORM_CONFIG.adminUi, ...s.adminUi },
    menus: { ...DEFAULT_PLATFORM_CONFIG.menus, ...s.menus },
    customMenus: Array.isArray(s.customMenus) ? s.customMenus : DEFAULT_PLATFORM_CONFIG.customMenus,
  }
}
