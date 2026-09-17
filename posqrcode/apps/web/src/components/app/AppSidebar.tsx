import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  Banknote,
  Calculator,
  ChefHat,
  ClipboardList,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Link2,
  LogOut,
  Mail,
  Package,
  QrCode,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Contact,
  UserRound,
  Users,
  UtensilsCrossed,
  Wallet,
  Globe,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BrandLogo } from '@/components/app/BrandLogo'
import { PlanBadge } from '@/components/app/PlanBadge'
import { useAppearance } from '@/hooks/use-appearance'
import { useAuth } from '@/hooks/use-auth'
import { isLightHex } from '@/lib/color'
import { useIndustryCopy, useIndustryProfile } from '@/hooks/use-industry-copy'
import { useNavConfig } from '@/hooks/use-nav-config'
import { useOrders } from '@/hooks/use-orders'
import { useStaff } from '@/hooks/use-staff'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { useTables } from '@/hooks/use-tables'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import { useLeads } from '@/hooks/use-leads'
import { useSupport } from '@/hooks/use-support'
import { useTenant } from '@/hooks/use-tenant'
import { useAttendance } from '@/hooks/use-staff-ops'
import { BRAND_NAME } from '@/lib/brand'
import { EMPTY_POS_PERMS, resolvePosPermissions, staffNavItems } from '@/lib/staff-access'
import type { FeatureKey } from '@/lib/tenant'
import { cn } from '@/lib/utils'

const STAFF_NAV_ICONS: Record<string, LucideIcon> = {
  posTerminal: Calculator,
  orders: ClipboardList,
  menu: UtensilsCrossed,
  expenses: Wallet,
}

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Brand pill count (Orders). */
  badge?: number
  /** Exits the shell (Kitchen full-screen). */
  external?: boolean
  /** Entitlement this item needs; absent = always available. */
  feature?: FeatureKey
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export const superNav: NavSection[] = [
  {
    items: [
      { to: '/super/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/super/restaurants', label: 'Restaurants', icon: Store },
      { to: '/super/support', label: 'Support', icon: LifeBuoy },
      { to: '/super/leads', label: 'Leads', icon: Mail },
      { to: '/super/industries', label: 'Industries', icon: LayoutGrid },
      { to: '/super/plans', label: 'Plans', icon: CreditCard },
      { to: '/super/billing', label: 'Billing', icon: Banknote },
      { to: '/super/shop', label: 'QR stands', icon: ShoppingBag },
      { to: '/super/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const restaurantNav: NavSection[] = [
  {
    label: 'General',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Operations',
    items: [
      { to: '/tables', label: 'Tables', icon: LayoutGrid, feature: 'tables' },
      { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
      { to: '/orders', label: 'Orders', icon: ClipboardList },
      { to: '/integrations', label: 'Integrations', icon: Link2 },
      { to: '/pos', label: 'POS', icon: Calculator, feature: 'pos' },
      { to: '/kitchen', label: 'Kitchen', icon: ChefHat, external: true, feature: 'kitchen' },
      { to: '/qr', label: 'QR Designer', icon: QrCode },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/inventory', label: 'Inventory', icon: Package, feature: 'inventory' },
      {
        to: '/staff',
        label: 'Staff',
        icon: Users,
        feature: 'staff',
      },
      { to: '/venue-setup', label: 'Ordering & checkout', icon: Store },
      { to: '/customers', label: 'Customers', icon: UserRound },
    ],
  },
  {
    label: 'Insights',
    items: [{ to: '/ai', label: 'AI Insights', icon: Sparkles, feature: 'ai' }],
  },
  {
    label: 'Account',
    items: [
      { to: '/shop', label: 'Shop', icon: ShoppingBag },
      { to: '/profile', label: 'Store profile', icon: Contact },
      { to: '/support', label: 'Support', icon: LifeBuoy },
      { to: '/billing', label: 'Billing', icon: CreditCard },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export interface AppSidebarProps {
  variant: 'super' | 'restaurant'
  /** Collapsed 72px rail (restaurant, tablet/desktop). */
  collapsed?: boolean
  /** Close the mobile Sheet after navigating. */
  onNavigate?: () => void
}

/** Dark portal sidebar (doc §4.1, §4.2, §7.1). Parent owns the width. */
export function AppSidebar({ variant, collapsed = false, onNavigate }: AppSidebarProps) {
  const { config } = usePlatformConfig()
  const { config: tenant, features } = useTenant()
  const { session, logout } = useAuth()
  const { employees } = useStaff()
  const location = useLocation()
  const venue = useCurrentVenue()
  const copy = useIndustryCopy()
  const industry = useIndustryProfile()
  const { apply: applyNavConfig } = useNavConfig()
  const { orders } = useOrders()
  const { upcomingCount } = useTables()
  const { rows: attendanceRows } = useAttendance()
  const { openCount: supportOpen, ticketsForRestaurant } = useSupport()
  const { newCount: leadsNew } = useLeads()
  const pendingOrders = orders.filter((o) => o.status === 'pending').length
  const unapprovedAttendance = attendanceRows.filter((r) => r.needsApproval).length
  const venueSupportOpen = ticketsForRestaurant(venue.id).filter(
    (t) => t.status === 'open' || t.status === 'pending',
  ).length
  const isStaff = variant === 'restaurant' && session?.role === 'staff'
  const staffLivePerms = (() => {
    if (!isStaff || !session?.employeeId) return session?.posPermissions ?? EMPTY_POS_PERMS
    const emp = employees.find((e) => e.id === session.employeeId)
    return emp ? resolvePosPermissions(emp) : (session.posPermissions ?? EMPTY_POS_PERMS)
  })()
  // Admin-selectable sidebar style + optional custom chrome colour.
  // Colors come from --nav-* CSS vars (theme + mode + colour picker).
  const { appearance } = useAppearance()
  const light = appearance.colors.sidebar
    ? isLightHex(appearance.colors.sidebar)
    : appearance.sidebarStyle === 'light'
  const industryHidden = new Set(industry.navHints.hide)
  // Platform controls (super admin) can hide restaurant features live.
  // Industry navHints hide modules entirely (cloud kitchen → no Tables).
  const PATH_TO_MENU_KEY: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/tables': 'tables',
    '/menu': 'menu',
    '/orders': 'orders',
    '/integrations': 'integrations',
    '/pos': 'pos',
    '/kitchen': 'kitchen',
    '/qr': 'qrDesigner',
    '/inventory': 'inventory',
    '/staff': 'staff',
    '/venue-setup': 'orderingCheckout',
    '/customers': 'customers',
    '/ai': 'aiInsights',
    '/shop': 'shop',
    '/profile': 'storeProfile',
    '/support': 'support',
    '/billing': 'billing',
    '/settings': 'settings',
  }

  // Platform controls (super admin) can hide restaurant features live.
  // Industry navHints hide modules entirely (cloud kitchen → no Tables).
  const enabled = (to: string, feature?: FeatureKey) => {
    if (industryHidden.has(to)) return false
    const key = PATH_TO_MENU_KEY[to]
    if (key && (config.menus as any)?.[key] === false) {
      return false
    }
    if (to === '/kitchen' && !config.service.kitchenDisplay) return false
    if (to === '/reports' && !config.adminUi.showReports) return false
    if (feature != null && !features[feature]) return false
    return true
  }
  // Plan-gated items stay visible and locked — hiding them creates support
  // tickets and kills discovery (doc §5.2 style A). What the *owner* hides in
  // Settings → Side menu is different, and applied by useNavConfig.
  // Industry-blocked features (tables: false) are hidden, not upgrade-locked.
  const industryBlocked = (item: NavItem) =>
    item.feature != null && industry.featureDefaults[item.feature] === false
  const liveBadge = (to: string, existing?: number) => {
    if (to === '/orders' || to.startsWith('/orders')) return pendingOrders || undefined
    if (to === '/tables') return upcomingCount || undefined
    if (to === '/staff') return unapprovedAttendance || undefined
    if (to === '/support') return venueSupportOpen || undefined
    if (to === '/super/support') return supportOpen || undefined
    if (to === '/super/leads') return leadsNew || undefined
    return existing
  }
  const relabel = (item: NavItem): NavItem => {
    if (item.to === '/tables') return { ...item, label: copy.spaces }
    if (item.to === '/menu') return { ...item, label: copy.catalog }
    return item
  }

  const staffSections: NavSection[] = isStaff
    ? [
        {
          label: 'Access',
          items: staffNavItems(staffLivePerms).map((item) => ({
            to: item.to,
            label: item.label,
            icon: STAFF_NAV_ICONS[item.key] ?? LayoutDashboard,
            badge: liveBadge(item.to),
          })),
        },
      ].filter((s) => s.items.length > 0)
    : []

  const customSections: NavSection[] =
    config.customMenus && config.customMenus.length > 0
      ? [
          {
            label: 'Platform Links',
            items: config.customMenus
              .filter((m) => m.enabled)
              .map((m) => {
                const IconComponent = (() => {
                  if (m.icon === 'Sparkles') return Sparkles
                  if (m.icon === 'Globe') return Globe
                  if (m.icon === 'HelpCircle') return HelpCircle
                  if (m.icon === 'Info') return LifeBuoy
                  return Link2
                })()
                return {
                  to: m.to,
                  label: m.label,
                  icon: IconComponent,
                  external: true,
                }
              }),
          },
        ].filter((s) => s.items.length > 0)
      : []

  const sections = isStaff
    ? staffSections
    : applyNavConfig(
        variant === 'super'
          ? superNav.map((section) => ({
              ...section,
              items: section.items.map((i) => ({ ...i, badge: liveBadge(i.to, i.badge) })),
            }))
          : restaurantNav
              .map((section) => ({
                ...section,
                items: section.items
                  .filter((i) => enabled(i.to, i.feature) && !industryBlocked(i))
                  .map((i) => relabel({ ...i, badge: liveBadge(i.to, i.badge) })),
              }))
              .filter((section) => section.items.length > 0)
              .concat(customSections),
      )

  const staffName = session?.staffName || 'Staff'
  const staffInitials =
    staffName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'ST'
  const ownerInitials = venue.ownerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'BB'
  const user =
    variant === 'super'
      ? { initials: 'AA', name: 'Anya A.', role: 'Super Admin', loginHref: '/super/login' }
      : isStaff
        ? {
            initials: staffInitials,
            name: staffName,
            role: venue.name,
            loginHref: '/staff-login',
          }
        : {
            initials: ownerInitials,
            name: venue.ownerName || 'Owner',
            role: venue.name,
            loginHref: '/login',
          }

  const staffLinkActive = (to: string) => {
    if (to.includes('?')) {
      const [path, qs] = to.split('?')
      return location.pathname === path && location.search.includes(qs)
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`)
  }

  return (
    <div className="flex h-full flex-col bg-nav text-nav-fg transition-colors duration-300">
      {/* Logo block */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2 border-b border-nav-border',
          collapsed ? 'justify-center px-0' : 'px-5',
        )}
      >
        <BrandLogo size={28} className={cn('rounded-md', !light && 'ring-1 ring-white/25')} />
        {!collapsed && (
          <span className="font-display text-lg font-bold tracking-tight text-nav-fg">
            {BRAND_NAME}
            {variant === 'super' && (
              <span className="ml-2 rounded bg-brand px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-widest text-brand-foreground">
                Super
              </span>
            )}
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section, si) => (
          <div key={section.label ?? si}>
            {section.label && !collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-nav-muted">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                if (!isStaff && item.feature != null && !features[item.feature]) {
                  return null
                }
                const isExternalWebLink = item.external && item.to.startsWith('http')
                if (isExternalWebLink) {
                  return (
                    <li key={item.to}>
                      <a
                        href={item.to}
                        target="_blank"
                        rel="noreferrer"
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors duration-200 text-nav-muted hover:bg-nav-hover hover:text-nav-fg',
                          collapsed && 'justify-center px-0',
                        )}
                      >
                        <item.icon className="nav-icon h-5 w-5 shrink-0" strokeWidth={1.75} />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && <ExternalLink className="nav-icon h-3.5 w-3.5 opacity-60" />}
                      </a>
                    </li>
                  )
                }
                return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/dashboard'}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive: routeActive }) => {
                      const isActive = isStaff ? staffLinkActive(item.to) : routeActive
                      return cn(
                        'relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors duration-200',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-brand font-semibold text-brand-foreground shadow-sm'
                          : 'text-nav-muted hover:bg-nav-hover hover:text-nav-fg',
                      )
                    }}
                  >
                    {({ isActive: routeActive }) => {
                      const isActive = isStaff ? staffLinkActive(item.to) : routeActive
                      return (
                      <>
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-foreground/80"
                          />
                        )}
                        <item.icon
                          className={cn('h-5 w-5 shrink-0', !isActive && 'nav-icon')}
                          strokeWidth={1.75}
                        />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && item.badge != null && item.badge > 0 && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-semibold',
                              isActive
                                ? 'bg-brand-foreground/15 text-brand-foreground'
                                : 'bg-brand px-2 py-0.5 text-brand-foreground',
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                        {!collapsed && item.external && (
                          <ExternalLink className="nav-icon h-3.5 w-3.5 opacity-60" />
                        )}
                      </>
                      )
                    }}
                  </NavLink>
                </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User block */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-3 border-t border-nav-border',
          collapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-nav-active text-xs font-semibold text-nav-fg">
            {user.initials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-nav-fg">
                <span className="truncate">{user.name}</span>
                {/* Tenant identity is always visible — a support agent on a
                    screen-share must always know the plan (doc §0.3). */}
                {variant === 'restaurant' && !isStaff && (
                  <Link to="/billing" onClick={onNavigate} className="shrink-0">
                    <PlanBadge plan={tenant.planId} compact />
                  </Link>
                )}
                {isStaff && (
                  <span className="shrink-0 rounded bg-nav-hover px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-nav-muted">
                    Staff
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-nav-muted">{user.role}</p>
            </div>
            <Link
              to={user.loginHref}
              title="Log out"
              onClick={() => {
                logout()
              }}
              className="rounded-lg p-2 text-nav-muted transition-colors hover:bg-nav-hover hover:text-nav-fg"
            >
              <LogOut className="nav-icon h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
