import { CheckCircle2, MoreVertical, Timer } from 'lucide-react'
import { TableChip } from '@/components/app/TableChip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { inr } from '@/lib/currency'
import { getElapsedMinutes } from '@/lib/mock'
import { advanceLabel, orderTypeOf } from '@/lib/order-flow'
import type { Order, OrderStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const advanceTone: Partial<Record<OrderStatus, string>> = {
  pending: 'bg-warning text-white hover:bg-warning/90',
  preparing: 'bg-info text-white hover:bg-info/90',
  ready: 'bg-success text-white hover:bg-success/90',
  served: 'bg-success text-white hover:bg-success/90',
}

/** Chip: where it came from + how it fulfills. */
function sourceLabel(order: Order): string {
  if (order.channel === 'swiggy') return '🟠 Swiggy'
  if (order.channel === 'zomato') return '🔴 Zomato'
  if (order.origin === 'pos') {
    if (order.orderType === 'takeaway') return 'POS · Takeaway'
    if (order.orderType === 'delivery') return 'POS · Delivery'
    return order.tableName || 'POS'
  }
  if (order.origin === 'counter-qr' || (!order.tableId && order.orderType !== 'dine-in')) {
    if (order.orderType === 'delivery') return 'Counter · Delivery'
    return 'Counter · Takeaway'
  }
  if (order.orderType === 'takeaway') return order.tableName || '🥡 Takeaway'
  if (order.orderType === 'delivery') return '🛵 Delivery'
  return order.tableName
}

/** Kanban elapsed tint: warning ≥10m, danger ≥20m (doc §7.7). */
function elapsedClass(minutes: number): string {
  if (minutes >= 20) return 'text-danger'
  if (minutes >= 10) return 'text-warning'
  return 'text-muted-foreground'
}

export interface OrderCardProps {
  order: Order
  onAdvance: (order: Order) => void
  onOpen: (order: Order) => void
  onCancel: (order: Order) => void
  /** Completed column renders a single collapsed row (doc §6.11). */
  collapsed?: boolean
}

export function OrderCard({ order, onAdvance, onOpen, onCancel, collapsed = false }: OrderCardProps) {
  const elapsed = getElapsedMinutes(order)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onOpen(order)}
        className="flex h-12 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left text-sm shadow-card transition-shadow hover:shadow-raised"
      >
        <span className="font-semibold text-foreground">#{order.number}</span>
        <span className="text-muted-foreground">{sourceLabel(order)}</span>
        <span className="ml-auto font-medium text-foreground">{inr(order.total)}</span>
        {order.paid && <CheckCircle2 className="h-4 w-4 text-success" />}
      </button>
    )
  }

  const type = orderTypeOf(order)
  const advanceText = advanceLabel(order.status, type)
  const advanceClass = advanceTone[order.status]
  const shownItems = order.items.slice(0, 3)
  const hiddenCount = order.items.length - shownItems.length

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <button type="button" onClick={() => onOpen(order)} className="block w-full text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">#{order.number}</span>
          <TableChip label={sourceLabel(order)} tone="muted" />
          <span
            className={cn(
              'ml-auto inline-flex items-center gap-1 text-xs font-medium',
              elapsedClass(elapsed),
            )}
          >
            <Timer className="h-3.5 w-3.5" />
            {elapsed}m
          </span>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-foreground">
          {shownItems.map((item) => (
            <li key={item.menuItemId} className="truncate">
              <span className="font-medium">{item.qty}×</span> {item.name}
            </li>
          ))}
          {hiddenCount > 0 && (
            <li className="text-xs text-muted-foreground">+{hiddenCount} more</li>
          )}
        </ul>
        <p className="mt-2 text-right text-sm font-semibold text-foreground">
          {inr(order.total)}
        </p>
      </button>

      {advanceText && advanceClass && (
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className={cn('h-9 flex-1 rounded-full font-semibold', advanceClass)}
            onClick={() => onAdvance(order)}
          >
            {advanceText.replace(/^Move to /, '')} →
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Order actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpen(order)}>View details</DropdownMenuItem>
              <DropdownMenuItem>Print KOT</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger focus:text-danger"
                onSelect={() => onCancel(order)}
              >
                Cancel order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
