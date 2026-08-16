import type { Order } from './types'
import type { DonutSlice, ReportRangePreset, SeriesPoint, StatRecord } from './types'
import { inr } from './currency'

function isBillable(order: Order): boolean {
  return order.status !== 'cancelled' && (order.paid === true || order.status === 'completed')
}

function daysAgoIso(d: number): string {
  return new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)
}

export const reportRangePresets: ReportRangePreset[] = [
  { id: 'today', label: 'Today', from: daysAgoIso(0), to: daysAgoIso(0) },
  { id: '7d', label: 'Last 7 days', from: daysAgoIso(6), to: daysAgoIso(0) },
  { id: '30d', label: 'Last 30 days', from: daysAgoIso(29), to: daysAgoIso(0) },
  {
    id: 'month',
    label: 'This month',
    from: `${new Date().toISOString().slice(0, 8)}01`,
    to: daysAgoIso(0),
  },
]

export interface LiveTopItem {
  rank: number
  itemId: string
  name: string
  emoji: string
  qty: number
  revenue: number
  trend: number
}

export interface LiveReports {
  stats: StatRecord[]
  revenueSeries: SeriesPoint[]
  ordersSeries: SeriesPoint[]
  topItems: LiveTopItem[]
  categoryMix: DonutSlice[]
  csv: string
  rangeLabel: string
  filteredCount: number
}

function inRange(iso: string, from: string, to: string): boolean {
  const day = iso.slice(0, 10)
  return day >= from && day <= to
}

/** Build report metrics from live orders, optionally filtered by date range. */
export function buildLiveReports(
  orders: Order[],
  range: Pick<ReportRangePreset, 'from' | 'to' | 'label'> = reportRangePresets[1]!,
): LiveReports {
  const scoped = orders.filter((o) => inRange(o.placedAt, range.from, range.to))
  const billable = scoped.filter(isBillable)
  const revenue = billable.reduce((s, o) => s + o.total, 0)
  const orderCount = billable.length
  const avg = orderCount ? Math.round(revenue / orderCount) : 0

  const byItem = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const order of billable) {
    for (const item of order.items) {
      const cur = byItem.get(item.menuItemId) ?? { name: item.name, qty: 0, revenue: 0 }
      cur.qty += item.qty
      cur.revenue += item.price * item.qty
      byItem.set(item.menuItemId, cur)
    }
  }
  const topItems: LiveTopItem[] = [...byItem.entries()]
    .map(([itemId, v]) => ({
      rank: 0,
      itemId,
      name: v.name,
      emoji: '🍽️',
      qty: v.qty,
      revenue: v.revenue,
      trend: 0,
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  const byDay = new Map<string, { revenue: number; orders: number }>()
  for (const order of billable) {
    const day = order.placedAt.slice(0, 10)
    const cur = byDay.get(day) ?? { revenue: 0, orders: 0 }
    cur.revenue += order.total
    cur.orders += 1
    byDay.set(day, cur)
  }

  // Fill every day in the selected range so charts aren't sparse.
  const labels: string[] = []
  const start = new Date(`${range.from}T12:00:00`)
  const end = new Date(`${range.to}T12:00:00`)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    labels.push(d.toISOString().slice(0, 10))
  }
  if (labels.length === 0) labels.push(range.to)

  const revenueSeries: SeriesPoint[] = labels.map((day) => {
    const short = day.slice(5).replace('-', '/')
    const cur = byDay.get(day)
    return { label: short, value: cur?.revenue ?? 0 }
  })
  const ordersSeries: SeriesPoint[] = labels.map((day) => {
    const short = day.slice(5).replace('-', '/')
    return { label: short, value: byDay.get(day)?.orders ?? 0 }
  })

  const categoryMix: DonutSlice[] =
    topItems.length > 0
      ? topItems.slice(0, 5).map((t) => ({ name: t.name, value: t.qty }))
      : [{ name: 'No sales yet', value: 1 }]

  const topName = topItems[0]?.name ?? '—'

  const stats: StatRecord[] = [
    {
      id: 'revenue',
      label: 'Revenue',
      value: inr(revenue),
      deltaLabel: range.label,
    },
    {
      id: 'orders',
      label: 'Orders',
      value: String(orderCount),
      deltaLabel: 'billable in range',
    },
    {
      id: 'avg-order',
      label: 'Avg order',
      value: inr(avg),
      deltaLabel: 'live',
    },
    {
      id: 'top-item',
      label: 'Top item',
      value: topName.length > 18 ? `${topName.slice(0, 16)}…` : topName,
      tone: 'info',
    },
  ]

  const header = 'orderId,number,channel,placedAt,status,paid,total,items\n'
  const body = billable
    .map((o) => {
      const items = o.items.map((i) => `${i.qty}x ${i.name}`).join('; ')
      return `${o.id},${o.number},${o.channel ?? 'direct'},${o.placedAt},${o.status},${Boolean(o.paid)},${o.total},"${items}"`
    })
    .join('\n')

  return {
    stats,
    revenueSeries,
    ordersSeries,
    topItems,
    categoryMix,
    csv: header + body,
    rangeLabel: range.label,
    filteredCount: billable.length,
  }
}
