import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  ExternalLink,
  LayoutGrid,
  LineChart,
  Plus,
  ShoppingBag,
  Wallet,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { ChartCard } from '@/components/app/ChartCard'
import { BarSeriesChart } from '@/components/app/charts'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { StatCard } from '@/components/app/StatCard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FinancePage } from '@/features/admin/finance/FinancePage'
import { ReportsPage } from '@/features/admin/reports/ReportsPage'
import { useAuth } from '@/hooks/use-auth'
import { useIndustryProfile } from '@/hooks/use-industry-copy'
import { useInventory } from '@/hooks/use-inventory'
import { useOrders } from '@/hooks/use-orders'
import { usePageState } from '@/hooks/use-page-state'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import { useStaff } from '@/hooks/use-staff'
import { useFeature } from '@/hooks/use-tenant'
import { buildLiveDashboard } from '@/lib/live-dashboard'
import { resolveStaffCapabilities } from '@/lib/staff-capabilities'
import type { ActivityType } from '@/lib/types'
import { cn } from '@/lib/utils'

const statIcons: Record<string, LucideIcon> = {
  'orders-today': ShoppingBag,
  'revenue-today': Wallet,
  pending: Clock,
  completed: CheckCircle2,
}

const activityIcons: Record<ActivityType, LucideIcon> = {
  'order-placed': ShoppingBag,
  'order-ready': CheckCircle2,
  'order-completed': CheckCircle2,
  'order-cancelled': XCircle,
  'item-sold-out': XCircle,
  'table-added': LayoutGrid,
  'restaurant-created': ShoppingBag,
}

const quickActions = [
  { to: '/menu', label: 'Menu item', icon: Plus },
  { to: '/tables', label: 'Table', icon: Plus },
  { to: '/orders', label: 'View orders', icon: ClipboardList },
  { to: '/kitchen', label: 'Open kitchen', icon: ChefHat, external: true },
]

type DashboardTab = 'overview' | 'reports' | 'finance'

function parseTab(raw: string | null, showReports: boolean): DashboardTab {
  if (raw === 'finance') return 'finance'
  if (raw === 'reports' && showReports) return 'reports'
  return 'overview'
}

/** Overview panel: today's stats, sales chart, popular, activity. */
function DashboardOverview() {
  const state = usePageState()
  const { config } = usePlatformConfig()
  const { alertCount, outCount } = useInventory()
  const { orders } = useOrders()
  const dash = useMemo(() => buildLiveDashboard(orders), [orders])
  const tablesOn = useFeature('tables')
  const kitchenOn = useFeature('kitchen')
  const industry = useIndustryProfile()
  const tablesHidden = industry.navHints.hide.includes('/tables') || !tablesOn
  const visibleQuickActions = quickActions.filter((a) => {
    if (a.to === '/kitchen' && (!config.service.kitchenDisplay || !kitchenOn)) return false
    if (a.to === '/tables' && tablesHidden) return false
    return true
  })
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today')
  const salesRanges = {
    today: dash.salesToday,
    week: dash.salesWeek,
    month: dash.salesMonth,
  }

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LoadingSkeleton variant="stat" count={4} />
        </div>
        <LoadingSkeleton variant="chart" />
      </div>
    )
  }

  if (!dash.hasOrders && state === 'empty') {
    return (
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon={LineChart}
          title="No sales yet today"
          description="Orders from your table QR codes will appear here live."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {(alertCount > 0 || outCount > 0) && (
        <Link
          to="/inventory"
          className="flex items-center gap-3 rounded-card border border-warning/40 bg-warning-tint/40 px-4 py-3 text-sm shadow-card transition-shadow hover:shadow-raised"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-foreground">Stock needs attention</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {alertCount} low · {outCount} out of stock — open Inventory to purchase or adjust.
            </span>
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dash.stats
          .filter((stat) => stat.id !== 'revenue-today' || config.adminUi.showRevenueStats)
          .map((stat) => (
            <StatCard
              key={stat.id}
              stat={stat}
              icon={statIcons[stat.id] ?? ShoppingBag}
              href={stat.id === 'pending' ? '/orders?status=pending' : undefined}
            />
          ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        {config.adminUi.showRevenueStats && (
          <ChartCard
            title="Sales"
            className="xl:col-span-8"
            height={260}
            action={
              <div className="flex rounded-full border border-line p-0.5">
                {(['today', 'week', 'month'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                      range === r
                        ? 'bg-brand font-semibold text-brand-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            }
          >
            <BarSeriesChart data={salesRanges[range]} currency />
          </ChartCard>
        )}

        <div
          className={cn(
            'rounded-card border border-line bg-surface p-6 shadow-card',
            config.adminUi.showRevenueStats ? 'xl:col-span-4' : 'xl:col-span-12',
          )}
        >
          <h3 className="text-base font-semibold">Popular items</h3>
          {dash.popularItems.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No sold items yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {dash.popularItems.map((item) => (
                <li key={item.itemId} className="flex h-12 items-center gap-3">
                  <span className="w-4 text-xs font-semibold text-muted-foreground">
                    {item.rank}
                  </span>
                  <span aria-hidden>{item.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                  <span className="text-sm font-semibold">×{item.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        {config.adminUi.showActivityFeed && (
          <div className="rounded-card border border-line bg-surface p-6 shadow-card xl:col-span-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Recent activity</h3>
              <Link
                to="/orders"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </div>
            {dash.activity.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No recent orders.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {dash.activity.slice(0, 5).map((event) => {
                  const Icon = activityIcons[event.type]
                  return (
                    <li key={event.id} className="flex h-12 items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{event.message}</span>
                      <span className="text-xs text-muted-foreground">
                        {event.meta && `${event.meta} · `}
                        {formatDistanceToNow(new Date(event.timestamp))} ago
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div
          className={cn(
            'rounded-card border border-line bg-surface p-6 shadow-card',
            config.adminUi.showActivityFeed ? 'xl:col-span-4' : 'xl:col-span-12',
          )}
        >
          <h3 className="text-base font-semibold">Quick actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {visibleQuickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-surface-muted/60 text-sm font-medium transition-colors hover:bg-brand-tint"
              >
                <a.icon className="h-5 w-5" />
                <span className="flex items-center gap-1">
                  {a.label}
                  {a.external && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Unified restaurant dashboard: Overview + Reports + Finance. */
export function DashboardPage() {
  const { config } = usePlatformConfig()
  const { session } = useAuth()
  const { employees } = useStaff()
  const isStaff = session?.role === 'staff'
  const staffEmp = isStaff
    ? employees.find((e) => e.id === session?.employeeId)
    : undefined
  const expenseOnly = staffEmp ? !resolveStaffCapabilities(staffEmp).addIncome : false
  const tablesOn = useFeature('tables')
  const kitchenOn = useFeature('kitchen')
  const reportsBasicOn = useFeature('reportsBasic')
  const reportsAdvOn = useFeature('reportsAdvanced')
  const reportsCustomOn = useFeature('reportsCustom')
  const staffOn = useFeature('staff')
  const payrollOn = useFeature('payroll')
  const industry = useIndustryProfile()
  const tablesHidden = industry.navHints.hide.includes('/tables') || !tablesOn
  const venue = useCurrentVenue()
  const [params, setParams] = useSearchParams()
  const hasReportsAccess = Boolean(reportsBasicOn || reportsAdvOn || reportsCustomOn)
  const hasFinanceAccess = Boolean(payrollOn || staffOn)
  const showReports = config.adminUi.showReports && !isStaff && hasReportsAccess
  const showFinance = hasFinanceAccess
  const tab = useMemo(() => {
    if (isStaff) return 'finance' as DashboardTab
    return parseTab(params.get('tab'), showReports)
  }, [isStaff, params, showReports])

  const visibleQuickActions = quickActions.filter((a) => {
    if (a.to === '/kitchen' && (!config.service.kitchenDisplay || !kitchenOn)) return false
    if (a.to === '/tables' && tablesHidden) return false
    return true
  })

  const setTab = (next: string) => {
    if (isStaff) return
    const value = next as DashboardTab
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (value === 'overview') p.delete('tab')
        else p.set('tab', value)
        return p
      },
      { replace: true },
    )
  }

  if (isStaff) {
    return (
      <>
        <PageHeader
          title="Finance"
          caption={`${venue.name} · ${format(new Date(), 'EEE, MMM d')}`}
        />
        <FinancePage embedded expenseOnly={expenseOnly} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Good morning, ${venue.name}`}
        caption={format(new Date(), 'EEE, MMM d')}
        actions={
          tab === 'overview' && visibleQuickActions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-full font-semibold">+ Quick action</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {visibleQuickActions.map((a) => (
                  <DropdownMenuItem key={a.label} asChild>
                    <Link to={a.to}>
                      <a.icon className="mr-2 h-4 w-4" />
                      {a.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {showReports && <TabsTrigger value="reports">Reports</TabsTrigger>}
          {showFinance && <TabsTrigger value="finance">Finance</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-0 outline-none">
          <DashboardOverview />
        </TabsContent>
        {showReports && (
          <TabsContent value="reports" className="mt-0 outline-none">
            <ReportsPage embedded />
          </TabsContent>
        )}
        {showFinance && (
          <TabsContent value="finance" className="mt-0 outline-none">
            <FinancePage embedded />
          </TabsContent>
        )}
      </Tabs>
    </>
  )
}
