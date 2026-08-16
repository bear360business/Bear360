import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertCircle,
  Download,
  LayoutGrid,
  LineChart,
  ShoppingBag,
  Store,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { ChartCard } from '@/components/app/ChartCard'
import { AreaSeriesChart, DonutChart } from '@/components/app/charts'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { StatCard } from '@/components/app/StatCard'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useLeads } from '@/hooks/use-leads'
import { usePageState } from '@/hooks/use-page-state'
import { useRestaurants } from '@/hooks/use-restaurants'
import { useSupport } from '@/hooks/use-support'
import { inr } from '@/lib/currency'
import { getCatalogPlanById } from '@/lib/plans-catalog'
import type { PlanId, SeriesPoint, StatRecord } from '@/lib/types'

const statIcons: Record<string, LucideIcon> = {
  restaurants: Store,
  mrr: Wallet,
  orders: ShoppingBag,
  'active-tables': LayoutGrid,
}

function planLabel(id: PlanId) {
  return getCatalogPlanById(id)?.name ?? id
}

/** Build an 8-month MRR series from when each active venue was created. */
function buildMrrSeries(
  restaurants: { createdAt: string; mrr: number; status: string }[],
): SeriesPoint[] {
  const now = new Date()
  const points: SeriesPoint[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const label = d.toLocaleDateString(undefined, { month: 'short' })
    const value = restaurants
      .filter((r) => r.status === 'active' || r.status === 'trial')
      .filter((r) => {
        const created = new Date(r.createdAt || 0)
        return !Number.isNaN(created.getTime()) ? created <= end : true
      })
      .reduce((sum, r) => sum + (r.mrr || 0), 0)
    points.push({ label, value })
  }
  return points
}

function ErrorCard({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Couldn't load {title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        Something went wrong on our side.
        <Button variant="ghost" size="sm" onClick={() => navigate('/super/dashboard')}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/** Platform dashboard: live venue KPIs + ops signals (doc §6.2). */
export function SuperDashboardPage() {
  const state = usePageState()
  const { restaurants, count } = useRestaurants()
  const { newCount: newLeads } = useLeads()
  const { openCount } = useSupport()
  const [range, setRange] = useState('30d')

  const live = useMemo(() => {
    const active = restaurants.filter((r) => r.status === 'active' || r.status === 'trial')
    const trials = restaurants.filter((r) => r.status === 'trial')
    const suspended = restaurants.filter((r) => r.status === 'suspended')
    const mrr = restaurants
      .filter((r) => r.status === 'active')
      .reduce((sum, r) => sum + (r.mrr || 0), 0)
    const planMix = (['basic', 'professional', 'enterprise'] as PlanId[]).map((id) => ({
      name: planLabel(id),
      value: restaurants.filter((r) => r.planId === id).length,
    })).filter((s) => s.value > 0)
    const recent = [...restaurants]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
    const revenueSeries = buildMrrSeries(restaurants)
    const stats: StatRecord[] = [
      {
        id: 'restaurants',
        label: 'Venues',
        value: String(count),
        delta: trials.length,
        deltaLabel: `${trials.length} on trial`,
      },
      {
        id: 'mrr',
        label: 'MRR (active)',
        value: inr(mrr),
        delta: active.length,
        deltaLabel: `${active.length} paying/trial`,
      },
      {
        id: 'orders',
        label: 'Open support',
        value: String(openCount),
        delta: openCount > 0 ? 1 : 0,
        deltaLabel: openCount > 0 ? 'Needs attention' : 'All clear',
        tone: openCount > 0 ? 'warning' : 'success',
      },
      {
        id: 'active-tables',
        label: 'New leads',
        value: String(newLeads),
        delta: newLeads,
        deltaLabel: `${suspended.length} suspended`,
        tone: newLeads > 0 ? 'info' : undefined,
      },
    ]
    return { stats, planMix, recent, trials, mrr, revenueSeries }
  }, [restaurants, count, newLeads, openCount])

  const exportCsv = () => {
    const header = 'id,name,owner,plan,status,mrr,industry,createdAt\n'
    const body = restaurants
      .map(
        (r) =>
          `${r.id},"${r.name}","${r.ownerName}",${r.planId},${r.status},${r.mrr},${r.industryId},${r.createdAt}`,
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bear360-platform-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Platform CSV downloaded', { description: `${restaurants.length} venues` })
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        caption="Live venue counts from this browser · support & leads included"
        actions={
          <>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-full" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {state === 'loading' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LoadingSkeleton variant="stat" count={4} />
          </div>
          <LoadingSkeleton variant="chart" />
          <div className="rounded-card border border-line bg-surface shadow-card">
            <LoadingSkeleton variant="table-row" count={5} />
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="space-y-4">
          <ErrorCard title="platform stats" />
          <ErrorCard title="revenue" />
        </div>
      )}

      {state === 'empty' && (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={LineChart}
            title="No data yet"
            description="Create your first restaurant to start seeing platform metrics."
            action={
              <Button asChild className="rounded-full font-semibold">
                <Link to="/super/restaurants/create">+ Add restaurant</Link>
              </Button>
            }
          />
        </div>
      )}

      {state === 'ready' && (
        <div className="space-y-6">
          {(live.trials.length > 0 || newLeads > 0 || openCount > 0) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ops snapshot</AlertTitle>
              <AlertDescription>
                {live.trials.length} trial{live.trials.length === 1 ? '' : 's'} · {newLeads} new
                lead{newLeads === 1 ? '' : 's'} · {openCount} open ticket
                {openCount === 1 ? '' : 's'}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {live.stats.map((stat) => (
              <StatCard key={stat.id} stat={stat} icon={statIcons[stat.id] ?? Store} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <ChartCard
              title="MRR trend"
              className="xl:col-span-8"
              action={
                <span className="text-xs text-muted-foreground">
                  Live MRR {inr(live.mrr)}
                </span>
              }
            >
              <AreaSeriesChart data={live.revenueSeries} currency />
            </ChartCard>
            <ChartCard title="Plan mix" className="xl:col-span-4">
              <DonutChart
                data={
                  live.planMix.length > 0
                    ? live.planMix
                    : [{ name: 'No venues', value: 1 }]
                }
              />
            </ChartCard>
          </div>

          <div className="rounded-card border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between px-6 py-4">
              <h3 className="text-base font-semibold text-foreground">Recent restaurants</h3>
              <Link
                to="/super/restaurants"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Owner</TableHead>
                  <TableHead className="hidden sm:table-cell">Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {live.recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.emoji} {r.name}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {r.ownerName}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {planLabel(r.planId)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {format(new Date(r.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  )
}
