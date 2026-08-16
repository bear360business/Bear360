import { inr } from './currency'
import type {
  ActivityEvent,
  ActivityType,
  Order,
  PopularItem,
  SeriesPoint,
  StatRecord,
} from './types'

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function isPending(o: Order): boolean {
  return o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
}

function isCompleted(o: Order): boolean {
  return o.status === 'completed' || o.status === 'served' || o.paid === true
}

function isBillable(o: Order): boolean {
  return o.status !== 'cancelled' && (o.paid === true || isCompleted(o))
}

function pctDelta(today: number, yesterday: number): number | undefined {
  if (yesterday === 0) return today > 0 ? 100 : undefined
  return Math.round(((today - yesterday) / yesterday) * 100)
}

export interface LiveDashboard {
  stats: StatRecord[]
  salesToday: SeriesPoint[]
  salesWeek: SeriesPoint[]
  salesMonth: SeriesPoint[]
  popularItems: PopularItem[]
  activity: ActivityEvent[]
  hasOrders: boolean
}

function activityType(status: Order['status']): ActivityType {
  if (status === 'cancelled') return 'order-cancelled'
  if (status === 'ready') return 'order-ready'
  if (status === 'completed' || status === 'served') return 'order-completed'
  return 'order-placed'
}

function activityMessage(o: Order): string {
  const where = o.tableName ? ` · ${o.tableName}` : ''
  if (o.status === 'cancelled') return `Order #${o.number} cancelled${where}`
  if (o.status === 'ready') return `Order #${o.number} ready${where}`
  if (o.status === 'completed' || o.status === 'served') {
    return `Order #${o.number} completed${where}`
  }
  if (o.status === 'preparing') return `Order #${o.number} preparing${where}`
  return `Order #${o.number} placed${where}`
}

/** Overview metrics from live orders (replaces mock dashboard seed). */
export function buildLiveDashboard(orders: Order[]): LiveDashboard {
  const todayStart = startOfLocalDay()
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)
  const monthStart = new Date(todayStart)
  monthStart.setDate(monthStart.getDate() - 29)

  const todayOrders = orders.filter((o) => new Date(o.placedAt) >= todayStart)
  const yesterdayOrders = orders.filter((o) => {
    const t = new Date(o.placedAt)
    return t >= yesterdayStart && t < todayStart
  })

  const ordersToday = todayOrders.filter((o) => o.status !== 'cancelled').length
  const ordersYesterday = yesterdayOrders.filter((o) => o.status !== 'cancelled').length
  const revenueToday = todayOrders.filter(isBillable).reduce((s, o) => s + o.total, 0)
  const revenueYesterday = yesterdayOrders.filter(isBillable).reduce((s, o) => s + o.total, 0)
  const pending = orders.filter(isPending).length
  const completedToday = todayOrders.filter(isCompleted).length
  const completedYesterday = yesterdayOrders.filter(isCompleted).length

  const stats: StatRecord[] = [
    {
      id: 'orders-today',
      label: 'Orders today',
      value: String(ordersToday),
      delta: pctDelta(ordersToday, ordersYesterday),
      deltaLabel: 'vs yesterday',
    },
    {
      id: 'revenue-today',
      label: 'Revenue today',
      value: inr(revenueToday),
      delta: pctDelta(revenueToday, revenueYesterday),
      deltaLabel: 'vs yesterday',
    },
    {
      id: 'pending',
      label: 'Pending',
      value: String(pending),
      tone: pending > 0 ? 'warning' : undefined,
      deltaLabel: 'live queue',
    },
    {
      id: 'completed',
      label: 'Completed today',
      value: String(completedToday),
      delta: pctDelta(completedToday, completedYesterday),
      deltaLabel: 'vs yesterday',
    },
  ]

  // Today by hour (0–23, show hours with data or last 12 hours)
  const byHour = new Map<number, number>()
  for (const o of todayOrders.filter(isBillable)) {
    const h = new Date(o.placedAt).getHours()
    byHour.set(h, (byHour.get(h) ?? 0) + o.total)
  }
  const hours =
    byHour.size > 0
      ? [...byHour.keys()].sort((a, b) => a - b)
      : Array.from({ length: 8 }, (_, i) => {
          const h = new Date().getHours() - (7 - i)
          return ((h % 24) + 24) % 24
        })
  const salesToday: SeriesPoint[] = hours.map((h) => ({
    label: `${String(h).padStart(2, '0')}:00`,
    value: byHour.get(h) ?? 0,
  }))

  const salesWeek: SeriesPoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const key = dayKey(d)
    const revenue = orders
      .filter((o) => o.placedAt.slice(0, 10) === key && isBillable(o))
      .reduce((s, o) => s + o.total, 0)
    return {
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: revenue,
    }
  })

  const salesMonth: SeriesPoint[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(monthStart)
    d.setDate(monthStart.getDate() + i)
    const key = dayKey(d)
    const revenue = orders
      .filter((o) => o.placedAt.slice(0, 10) === key && isBillable(o))
      .reduce((s, o) => s + o.total, 0)
    return {
      label: `${d.getDate()}`,
      value: revenue,
    }
  })

  const byItem = new Map<string, { name: string; qty: number; revenue: number }>()
  for (const o of orders.filter(isBillable)) {
    for (const item of o.items) {
      const id = item.menuItemId || item.name
      const cur = byItem.get(id) ?? { name: item.name, qty: 0, revenue: 0 }
      cur.qty += item.qty
      cur.revenue += item.price * item.qty
      byItem.set(id, cur)
    }
  }
  const popularItems: PopularItem[] = [...byItem.entries()]
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
    .slice(0, 8)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  const activity: ActivityEvent[] = [...orders]
    .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt))
    .slice(0, 20)
    .map((o) => ({
      id: o.id,
      type: activityType(o.status),
      message: activityMessage(o),
      meta: inr(o.total),
      timestamp: o.servedAt ?? o.placedAt,
    }))

  return {
    stats,
    salesToday,
    salesWeek,
    salesMonth,
    popularItems,
    activity,
    hasOrders: orders.length > 0,
  }
}
