import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import {
  BarChart3,
  Bell,
  Calculator,
  CalendarDays,
  ChefHat,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Factory,
  Mail,
  Menu as MenuIcon,
  Moon,
  Package,
  PanelLeft,
  Search,
  Settings,
  Store,
  Sun,
  User,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppearance } from '@/hooks/use-appearance'
import { useAuth } from '@/hooks/use-auth'
import { useLeads } from '@/hooks/use-leads'
import {
  setCurrentRestaurantId,
  useCurrentVenue,
  useRestaurants,
} from '@/hooks/use-restaurants'
import { useSupport } from '@/hooks/use-support'
import { readSuperSettings } from '@/lib/super-settings'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const pageLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  pos: 'POS',
  restaurants: 'Restaurants',
  create: 'Create store',
  edit: 'Edit restaurant',
  plans: 'Plans',
  settings: 'Settings',
  tables: 'Tables',
  reservations: 'Reservations',
  menu: 'Menu',
  appearance: 'Menu Appearance',
  orders: 'Orders',
  reports: 'Reports',
  inventory: 'Inventory',
  items: 'Ingredients',
  categories: 'Categories',
  suppliers: 'Suppliers',
  purchases: 'Purchases',
  staff: 'Staff',
  roles: 'Roles',
  schedule: 'Schedule',
  attendance: 'Attendance',
  payroll: 'Payroll',
  ai: 'AI Insights',
  billing: 'Billing',
  customers: 'Customers',
  finance: 'Finance',
  qr: 'QR Designer',
  shop: 'Shop',
  profile: 'Store profile',
  'venue-setup': 'Ordering & checkout',
  integrations: 'Integrations',
  support: 'Support',
  leads: 'Leads',
  industries: 'Industries',
}

const superCommands = [
  { to: '/super/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/super/restaurants', label: 'Restaurants', icon: Store },
  { to: '/super/restaurants/create', label: 'Create store', icon: Store },
  { to: '/super/support', label: 'Support', icon: LifeBuoy },
  { to: '/super/leads', label: 'Leads', icon: Mail },
  { to: '/super/industries', label: 'Industries', icon: Factory },
  { to: '/super/plans', label: 'Plans', icon: CreditCard },
  { to: '/super/shop', label: 'QR stands & shop', icon: Package },
  { to: '/super/settings', label: 'Settings', icon: Settings },
]

const restaurantCommands = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pos', label: 'POS', icon: Calculator },
  { to: '/tables', label: 'Tables', icon: LayoutGrid },
  { to: '/tables/reservations', label: 'Reservations', icon: CalendarDays },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/menu/appearance', label: 'Menu appearance', icon: UtensilsCrossed },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/qr', label: 'QR Designer', icon: Store },
  { to: '/venue-setup', label: 'Ordering & checkout', icon: Store },
  { to: '/profile', label: 'Store profile', icon: User },
  { to: '/dashboard?tab=finance', label: 'Finance', icon: CreditCard },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/kitchen', label: 'Kitchen display', icon: ChefHat },
  { to: '/dashboard?tab=reports', label: 'Reports', icon: BarChart3 },
  { to: '/shop', label: 'Shop', icon: Package },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function getPlanLabel(planId: string) {
  if (planId === 'professional') return 'Professional'
  if (planId === 'enterprise') return 'Enterprise'
  return 'Basic'
}

export interface TopHeaderProps {
  portal: 'super' | 'restaurant'
  /** Mobile: opens the sidebar Sheet. */
  onMenuClick?: () => void
  /** Restaurant desktop/tablet: collapses the rail. */
  onToggleCollapse?: () => void
  /** Floating nav layout: render as a rounded card aligned with the floating rail. */
  floating?: boolean
}

/** 64px sticky white header: collapse · breadcrumb · search ⌘K · 🔔 · avatar (doc §4.3, §7.2). */
export function TopHeader({ portal, onMenuClick, onToggleCollapse, floating = false }: TopHeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { appearance, setAppearance } = useAppearance()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const venue = useCurrentVenue()
  const { restaurants } = useRestaurants()
  const { logout, session, bindRestaurant } = useAuth()
  const { leads, newCount: newLeads } = useLeads()
  const { tickets, openCount: openTickets } = useSupport()

  const superNotifs = useMemo(() => {
    const items: { id: string; message: string; meta?: string; timestamp: string; href: string }[] =
      []
    for (const l of leads.filter((x) => x.status === 'new').slice(0, 3)) {
      items.push({
        id: `lead-${l.id}`,
        message: `New lead from ${l.name}`,
        meta: l.businessName || l.email,
        timestamp: l.createdAt,
        href: '/super/leads',
      })
    }
    for (const t of tickets
      .filter((x) => x.status === 'open' || x.status === 'pending')
      .slice(0, 3)) {
      items.push({
        id: `sup-${t.id}`,
        message: `#${t.number} ${t.subject}`,
        meta: t.restaurantName,
        timestamp: t.updatedAt,
        href: '/super/support',
      })
    }
    for (const r of restaurants.filter((x) => x.status === 'trial').slice(0, 2)) {
      items.push({
        id: `trial-${r.id}`,
        message: `${r.name} is on trial`,
        meta: getPlanLabel(r.planId),
        timestamp: `${r.createdAt}T12:00:00.000Z`,
        href: '/super/restaurants',
      })
    }
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8)
  }, [leads, tickets, restaurants])

  const notifUnread =
    portal === 'super' ? newLeads + openTickets > 0 : false

  const isStaff = portal === 'restaurant' && session?.role === 'staff'

  // Only this owner's stores — never the full platform catalogue.
  const myVenues = useMemo(() => {
    if (portal !== 'restaurant' || !session?.email || session.role === 'staff') return []
    const email = session.email.toLowerCase()
    const bound = new Set([
      ...(session.restaurantIds ?? []),
      ...(session.restaurantId ? [session.restaurantId] : []),
    ])
    return restaurants.filter(
      (r) =>
        r.ownerEmail.toLowerCase() === email ||
        bound.has(r.id) ||
        bound.has(r.slug),
    )
  }, [portal, session, restaurants])

  // If LS still points at another tenant's venue, snap back to an owned one.
  useEffect(() => {
    if (portal !== 'restaurant' || isStaff || myVenues.length === 0) return
    const ok = myVenues.some((r) => r.id === venue.id || r.slug === venue.id)
    if (!ok) {
      const fallback = myVenues[0]!
      setCurrentRestaurantId(fallback.id)
      bindRestaurant(fallback.id)
    }
  }, [portal, isStaff, myVenues, venue.id, bindRestaurant])

  const rootLabel = portal === 'super' ? 'Super Admin' : venue.name
  const segments = pathname.split('/').filter((s) => s && s !== 'super')
  const pageLabel = pageLabels[segments[segments.length - 1]] ?? pageLabels[segments[0]] ?? 'Dashboard'
  const commands =
    portal === 'super'
      ? superCommands
      : isStaff
        ? restaurantCommands.filter((c) => {
            const perms = session?.posPermissions
            if (!perms) return false
            if (c.to === '/pos') return perms.posTerminal
            if (c.to === '/orders') return perms.orders
            if (c.to === '/menu' || c.to.startsWith('/menu/')) return perms.menu
            if (c.to.includes('tab=finance')) return perms.expenses
            return false
          })
        : restaurantCommands
  const ownerInitials = isStaff
    ? (session?.staffName || 'ST')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('') || 'ST'
    : venue.ownerName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('') || 'BB'
  const superIdentity = portal === 'super' ? readSuperSettings() : null
  const superMember =
    superIdentity?.team.find(
      (m) => m.email.toLowerCase() === (session?.email ?? '').toLowerCase(),
    ) ?? superIdentity?.team.find((m) => m.role === 'owner')
  const superName = superMember?.name ?? session?.email?.split('@')[0] ?? 'Super'
  const superInitials =
    superName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || 'SA'
  const user =
    portal === 'super'
      ? {
          initials: superInitials,
          name: superName,
          email: session?.email ?? 'anya@bear360.app',
          loginHref: '/super/login',
        }
      : isStaff
        ? {
            initials: ownerInitials,
            name: session?.staffName || 'Staff',
            email: venue.name,
            loginHref: '/staff-login',
          }
        : {
            initials: ownerInitials,
            name: venue.ownerName || 'Owner',
            email: session?.email ?? venue.ownerEmail,
            loginHref: '/login',
          }
  const settingsHref = portal === 'super' ? '/super/settings' : '/settings'
  const profileHref = portal === 'super' ? '/super/settings' : '/profile'
  const homeHref =
    portal === 'super'
      ? '/super/dashboard'
      : isStaff
        ? commands[0]?.to ?? '/staff-access'
        : '/dashboard'

  return (
    <header
      className={
        floating
          ? 'chrome-navbar flex h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-card md:px-6'
          : 'chrome-navbar sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 md:px-6'
      }
    >
      {onMenuClick && (
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <MenuIcon className="nav-icon h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      )}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={onToggleCollapse}
        >
          <PanelLeft className="nav-icon h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      )}

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:inline-flex">
            <BreadcrumbLink asChild>
              <Link to={homeHref}>{rootLabel}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:block" />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{pageLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1" />

      <button
        onClick={() => setSearchOpen(true)}
        className="hidden h-9 w-56 items-center gap-2 rounded-[10px] border border-line bg-surface-muted/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-surface-muted md:flex"
      >
        <Search className="nav-icon h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder={portal === 'super' ? 'Search restaurants, owners…' : 'Search menu, orders, tables…'}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Go to">
            {commands.map((c) => (
              <CommandItem
                key={c.to}
                onSelect={() => {
                  setSearchOpen(false)
                  navigate(c.to)
                }}
              >
                <c.icon className="mr-2 h-4 w-4" />
                {c.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setAppearance({ mode: appearance.mode === 'dark' ? 'light' : 'dark' })}
        title={appearance.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {appearance.mode === 'dark' ? (
          <Sun className="nav-icon h-5 w-5" />
        ) : (
          <Moon className="nav-icon h-5 w-5" />
        )}
        <span className="sr-only">Toggle dark mode</span>
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="nav-icon h-5 w-5" />
            {notifUnread && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <p className="border-b border-line px-4 py-3 text-sm font-semibold">
            {portal === 'super' ? 'Platform alerts' : 'Notifications'}
          </p>
          <ul className="max-h-72 overflow-y-auto">
            {portal === 'super' ? (
              superNotifs.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No open leads or tickets
                </li>
              ) : (
                superNotifs.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-surface-muted/60"
                      onClick={() => navigate(n.href)}
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                      <div className="min-w-0">
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {n.meta && `${n.meta} · `}
                          {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  </li>
                ))
              )
            ) : (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No notifications
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>

      {portal === 'restaurant' && myVenues.length > 1 && (
        <Select
          value={venue.id}
          onValueChange={(id) => {
            setCurrentRestaurantId(id)
            bindRestaurant(id)
            toast.success('Switched venue', {
              description: myVenues.find((r) => r.id === id)?.name,
            })
          }}
        >
          <SelectTrigger className="hidden h-9 max-w-[180px] sm:flex">
            <SelectValue placeholder="Your stores" />
          </SelectTrigger>
          <SelectContent>
            {myVenues.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.emoji} {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none ring-ring focus-visible:ring-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-ink-800 text-xs font-semibold text-white">
                {user.initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          {!isStaff && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(profileHref)}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(settingsHref)}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              logout()
              navigate(user.loginHref)
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
