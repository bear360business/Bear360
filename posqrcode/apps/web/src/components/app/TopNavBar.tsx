import { NavLink } from 'react-router-dom'
import {
  Calculator,
  ClipboardList,
  ExternalLink,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { BrandLogo } from '@/components/app/BrandLogo'
import { restaurantNav, superNav } from '@/components/app/AppSidebar'
import { useAppearance } from '@/hooks/use-appearance'
import { useAuth } from '@/hooks/use-auth'
import { useNavConfig } from '@/hooks/use-nav-config'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { useStaff } from '@/hooks/use-staff'
import { useTenant } from '@/hooks/use-tenant'
import { BRAND_NAME } from '@/lib/brand'
import { EMPTY_POS_PERMS, resolvePosPermissions, staffNavItems } from '@/lib/staff-access'
import type { FeatureKey } from '@/lib/tenant'
import { cn } from '@/lib/utils'

const STAFF_ICONS: Record<string, LucideIcon> = {
  posTerminal: Calculator,
  orders: ClipboardList,
  menu: UtensilsCrossed,
  expenses: Wallet,
}

export interface TopNavBarProps {
  variant: 'super' | 'restaurant'
}

/** Uber-style horizontal navbar — theme colors follow Appearance live. */
export function TopNavBar({ variant }: TopNavBarProps) {
  useAppearance() // subscribe so theme/nav/mode changes re-render
  const { config } = usePlatformConfig()
  const { apply } = useNavConfig()
  const { features } = useTenant()
  const { session } = useAuth()
  const { employees } = useStaff()
  const isStaff = variant === 'restaurant' && session?.role === 'staff'
  const staffPerms = (() => {
    if (!isStaff || !session?.employeeId) return session?.posPermissions ?? EMPTY_POS_PERMS
    const emp = employees.find((e) => e.id === session.employeeId)
    return emp ? resolvePosPermissions(emp) : (session.posPermissions ?? EMPTY_POS_PERMS)
  })()

  const enabled = (to: string) =>
    (to !== '/kitchen' || config.service.kitchenDisplay) &&
    (to !== '/reports' || config.adminUi.showReports)
  const items = isStaff
    ? staffNavItems(staffPerms).map((item) => ({
        to: item.to,
        label: item.label,
        icon: STAFF_ICONS[item.key] ?? Calculator,
        feature: undefined as FeatureKey | undefined,
        external: undefined as boolean | undefined,
        badge: undefined as number | undefined,
      }))
    : apply(
        (variant === 'super' ? superNav : restaurantNav).map((section) => ({
          ...section,
          items: section.items.filter((item) => enabled(item.to)),
        })),
      ).flatMap((section) => section.items)

  return (
    <nav className="flex h-14 items-center gap-1 overflow-x-auto border-b border-nav-border bg-nav px-4 text-nav-fg transition-colors duration-300 [scrollbar-width:none]">
      <span className="flex shrink-0 items-center gap-2 pr-2">
        <BrandLogo size={26} className="rounded-md ring-1 ring-white/20" />
        <span className="font-display text-base font-bold tracking-tight text-nav-fg">
          {BRAND_NAME}
        </span>
        {variant === 'super' && (
          <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-foreground">
            Super
          </span>
        )}
      </span>
      <span className="mx-2 h-6 w-px shrink-0 bg-nav-border" />

      {items
        .filter((item) => !item.feature || features[item.feature])
        .map((item) => {
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-brand font-semibold text-brand-foreground shadow-sm'
                    : 'text-nav-muted hover:bg-nav-hover hover:text-nav-fg',
                )
              }
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                  {item.badge}
                </span>
              )}
              {item.external && <ExternalLink className="h-3 w-3 opacity-60" />}
            </NavLink>
          )
        })}
    </nav>
  )
}
