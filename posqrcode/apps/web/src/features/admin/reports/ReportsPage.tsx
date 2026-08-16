import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  BarChart3,
  CalendarRange,
  Crown,
  Download,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { ChartCard } from '@/components/app/ChartCard'
import { AreaSeriesChart, BarSeriesChart, DonutChart } from '@/components/app/charts'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { StatCard } from '@/components/app/StatCard'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useOrders } from '@/hooks/use-orders'
import { usePageState } from '@/hooks/use-page-state'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { inr } from '@/lib/currency'
import { buildLiveReports, reportRangePresets } from '@/lib/live-reports'
import { cn } from '@/lib/utils'

const statIcons: Record<string, LucideIcon> = {
  revenue: Wallet,
  orders: ShoppingBag,
  'avg-order': Wallet,
  'top-item': Crown,
}

/** Reports: live orders → revenue, top items, category mix + real CSV export. */
export function ReportsPage({ embedded = false }: { embedded?: boolean }) {
  const state = usePageState()
  const { config } = usePlatformConfig()
  const { orders } = useOrders()
  const [preset, setPreset] = useState(reportRangePresets[1]!)
  const live = useMemo(() => buildLiveReports(orders, preset), [orders, preset])
  const maxQty = Math.max(1, ...live.topItems.map((i) => i.qty))

  if (!config.adminUi.showReports) {
    return (
      <div className="rounded-card border border-line bg-surface shadow-card">
        <EmptyState
          icon={BarChart3}
          title="Reports are turned off"
          description="A platform admin disabled reports for restaurant portals. Re-enable them in Super Admin → Settings → Platform controls."
        />
      </div>
    )
  }

  const exportCsv = () => {
    const billableRows = Math.max(0, live.csv.split('\n').length - 1)
    const blob = new Blob([live.csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bear360-orders-${preset.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded', {
      description: `${billableRows} billable order${billableRows === 1 ? '' : 's'} (of ${orders.length} total).`,
    })
  }

  const toolbar = (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="rounded-full">
            <CalendarRange className="h-4 w-4" /> {preset.label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-2">
          {reportRangePresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p)}
              className={cn(
                'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted',
                p.id === preset.id && 'bg-brand-tint font-semibold',
              )}
            >
              {p.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <Button variant="outline" className="rounded-full" onClick={exportCsv}>
        <Download className="h-4 w-4" /> Export CSV
      </Button>
    </>
  )

  return (
    <>
      {!embedded && (
        <PageHeader
          title="Reports"
          caption={`Live from orders · ${live.rangeLabel}`}
          actions={toolbar}
        />
      )}
      {embedded && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Live from orders · {live.rangeLabel}
          </p>
          <div className="flex flex-wrap gap-2">{toolbar}</div>
        </div>
      )}

      {state === 'loading' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LoadingSkeleton variant="stat" count={4} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <LoadingSkeleton variant="chart" count={2} />
          </div>
        </div>
      )}

      {state !== 'loading' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {live.stats.map((stat) => (
              <StatCard key={stat.id} stat={stat} icon={statIcons[stat.id] ?? Wallet} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <ChartCard title="Revenue" className="xl:col-span-7">
              <AreaSeriesChart data={live.revenueSeries} currency />
            </ChartCard>
            <ChartCard title="Orders by day" className="xl:col-span-5">
              <BarSeriesChart data={live.ordersSeries} />
            </ChartCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <div className="rounded-card border border-line bg-surface p-6 shadow-card xl:col-span-7">
              <h3 className="text-base font-semibold">Top items</h3>
              {live.topItems.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="No billable orders yet"
                  description="Place a POS or QR order and mark it paid/completed to see top items."
                />
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {live.topItems.map((item) => (
                    <li key={item.itemId} className="flex items-center gap-3 py-2.5">
                      <span className="w-5 text-xs font-semibold text-muted-foreground">
                        {item.rank}
                      </span>
                      <span aria-hidden>{item.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.name}</p>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${(item.qty / maxQty) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-10 text-right text-sm font-semibold">×{item.qty}</span>
                      <span className="hidden w-16 text-right text-sm text-muted-foreground sm:block">
                        {inr(item.revenue)}
                      </span>
                      <span
                        className={cn(
                          'hidden w-14 items-center justify-end gap-0.5 text-xs font-semibold md:flex',
                          item.trend >= 0 ? 'text-success' : 'text-danger',
                        )}
                      >
                        {item.trend >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(item.trend)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ChartCard title="By item mix" className="xl:col-span-5" height={320}>
              <DonutChart data={live.categoryMix} />
            </ChartCard>
          </div>
        </div>
      )}
    </>
  )
}
