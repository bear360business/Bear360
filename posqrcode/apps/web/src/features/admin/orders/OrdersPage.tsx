import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ClipboardList, PartyPopper, Search } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { OrderCard } from '@/components/app/OrderCard'
import { PageHeader } from '@/components/app/PageHeader'
import { StatusBadge } from '@/components/app/StatusBadge'
import { TableChip } from '@/components/app/TableChip'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-media-query'
import { inr } from '@/lib/currency'
import { usePageState } from '@/hooks/use-page-state'
import { useOrders } from '@/hooks/use-orders'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import {
  advanceLabel,
  kanbanColumnLabel,
  nextStatus,
  orderStatusLabel,
  orderTypeOf,
  shortStatusLabel,
} from '@/lib/order-flow'
import { ORDER_KANBAN_STATUSES, getStatusStyle } from '@/lib/status'
import type { Order, OrderStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const columnBar: Record<OrderStatus, string> = {
  pending: 'bg-warning',
  preparing: 'bg-info',
  ready: 'bg-success',
  served: 'bg-brand',
  completed: 'bg-muted-foreground',
  cancelled: 'bg-danger',
}

/** Live orders kanban: Pending → Preparing → Ready → Served → Completed (doc §6.11). */
export function OrdersPage() {
  const state = usePageState()
  const isMobile = useIsMobile()
  const [params] = useSearchParams()
  const venue = useCurrentVenue()
  // Bill labels derive from the restaurant's GST rate (CGST/SGST are equal halves).
  const gstHalfPct = (venue.gstRatePct || 5) / 2
  const { orders, advance: advanceOrder, cancel: cancelOrder } = useOrders()
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  // Read the detail order back out of the store so the sheet reflects live
  // changes (the kitchen may advance it while it's open).
  const detail = detailId ? (orders.find((o) => o.id === detailId) ?? null) : null
  const setDetail = (order: Order | null) => setDetailId(order?.id ?? null)
  const initialSegment = params.get('status')
  const [segment, setSegment] = useState<OrderStatus>(
    ORDER_KANBAN_STATUSES.includes(initialSegment as OrderStatus)
      ? (initialSegment as OrderStatus)
      : 'pending',
  )

  const isToday = (iso?: string) => {
    if (!iso) return false
    const d = new Date(iso)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }

  const completedToday = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === 'completed' &&
          isToday(o.servedAt || o.placedAt),
      ),
    [orders],
  )

  const byStatus = useMemo(() => {
    const visible = orders.filter(
      (o) =>
        query === '' ||
        `#${o.number}`.includes(query) ||
        String(o.number).includes(query) ||
        o.tableName.toLowerCase().includes(query.toLowerCase()) ||
        (o.customerName ?? '').toLowerCase().includes(query.toLowerCase()),
    )
    return Object.fromEntries(
      ORDER_KANBAN_STATUSES.map((s) => [s, visible.filter((o) => o.status === s)]),
    ) as Record<OrderStatus, Order[]>
  }, [orders, query])

  const revenueToday = useMemo(
    () => completedToday.reduce((sum, o) => sum + (o.total || 0), 0),
    [completedToday],
  )

  const completedTodayCount = completedToday.length

  const advance = (order: Order) => {
    const next = nextStatus(order.status)
    if (!next) return
    advanceOrder(order.id)
    toast.success(`#${order.number} → ${orderStatusLabel(next, orderTypeOf(order))}`)
  }

  const cancel = (order: Order) => {
    cancelOrder(order.id)
    toast.error(`#${order.number} cancelled`)
  }

  const columns = isMobile ? [segment] : ORDER_KANBAN_STATUSES

  return (
    <>
      <PageHeader
        title="Orders"
        caption="Live board"
        actions={
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="#order or table"
              className="pl-9"
            />
          </div>
        }
      />

      {/* Sticky summary bar */}
      <div className="sticky top-16 z-20 mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl bg-surface-muted/80 px-4 py-3 text-sm backdrop-blur">
        {ORDER_KANBAN_STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', columnBar[s])} />
            <span className="font-semibold">
              {s === 'completed' ? completedTodayCount : byStatus[s].length}
            </span>
            <span className="text-muted-foreground">{getStatusStyle(s).label}</span>
          </span>
        ))}
        <span className="ml-auto font-display text-base font-bold">
          {inr(revenueToday)}
        </span>
      </div>

      {/* Mobile segmented switcher */}
      {isMobile && (
        <div className="mb-4 flex rounded-full border border-line bg-surface p-1">
          {ORDER_KANBAN_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={cn(
                'flex-1 rounded-full py-1.5 text-xs font-medium transition-colors',
                segment === s ? 'bg-brand font-semibold text-brand-foreground' : 'text-muted-foreground',
              )}
            >
              {shortStatusLabel(s)}
            </button>
          ))}
        </div>
      )}

      {state === 'loading' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {Array.from({ length: isMobile ? 1 : 4 }, (_, i) => (
            <div key={i} className="space-y-3">
              <LoadingSkeleton variant="card" count={2} />
            </div>
          ))}
        </div>
      )}

      {state === 'empty' && (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={ClipboardList}
            title="No orders yet"
            description="Orders from table QR, counter QR, and POS appear here live."
          />
        </div>
      )}

      {(state === 'ready' || state === 'error') && (
        <div
          className={cn(
            'grid items-start gap-4',
            !isMobile && 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5',
          )}
        >
          {columns.map((status) => {
            const list = byStatus[status]
            return (
              <section key={status} className="rounded-card border border-line bg-surface-muted/40">
                <div className={cn('h-[3px] rounded-t-card', columnBar[status])} />
                <header className="flex items-center justify-between px-4 py-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {kanbanColumnLabel(status)}
                  </h2>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {status === 'completed' ? completedTodayCount : list.length}
                  </span>
                </header>
                <div className="max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto px-3 pb-3">
                  {list.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line py-6 text-center text-xs text-muted-foreground">
                      Nothing {getStatusStyle(status).label.toLowerCase()}{' '}
                      {status === 'pending' && '🎉'}
                    </p>
                  ) : (
                    list.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        collapsed={status === 'completed'}
                        onAdvance={advance}
                        onOpen={setDetail}
                        onCancel={cancel}
                      />
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Order detail sheet */}
      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  Order #{detail.number}
                  <StatusBadge status={detail.status} />
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2">
                  <TableChip
                    label={
                      detail.orderType === 'takeaway'
                        ? '🥡 Takeaway'
                        : detail.orderType === 'delivery'
                          ? '🛵 Delivery'
                          : detail.tableName
                    }
                    tone="muted"
                  />
                  Placed {format(new Date(detail.placedAt), 'h:mm a')} · Token {detail.token}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-6">
                {(detail.customerName ||
                  detail.customerPhone ||
                  detail.paymentMethod ||
                  detail.deliveryAddress) && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Guest</h4>
                    <dl className="space-y-1.5 rounded-xl border border-line px-4 py-3 text-sm">
                      {detail.customerName && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Name</dt>
                          <dd className="font-medium">{detail.customerName}</dd>
                        </div>
                      )}
                      {detail.customerPhone && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Phone</dt>
                          <dd className="font-medium">{detail.customerPhone}</dd>
                        </div>
                      )}
                      {detail.paymentMethod && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">Payment</dt>
                          <dd className="font-medium">
                            {detail.paymentMethod === 'online'
                              ? 'Pay online (demo)'
                              : 'Pay at counter / cash'}
                          </dd>
                        </div>
                      )}
                      {detail.deliveryAddress && (
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-muted-foreground">Address</dt>
                          <dd className="text-right font-medium">{detail.deliveryAddress}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Items</h4>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {detail.items.map((item) => (
                      <li key={item.menuItemId} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <span className="font-semibold">{item.qty}×</span>
                        <span className="min-w-0 flex-1">
                          {item.name}
                          {item.note && (
                            <span className="block text-xs italic text-muted-foreground">
                              — {item.note}
                            </span>
                          )}
                        </span>
                        <span className="font-medium">{inr(item.price * item.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {detail.note && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Order note</h4>
                    <p className="rounded-xl bg-brand-tint px-4 py-3 text-sm">📝 {detail.note}</p>
                  </div>
                )}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Bill</h4>
                  <dl className="space-y-1.5 rounded-xl border border-line px-4 py-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd>{inr(detail.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">CGST ({gstHalfPct}%)</dt>
                      <dd>{inr(detail.cgst)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">SGST ({gstHalfPct}%)</dt>
                      <dd>{inr(detail.sgst)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
                      <dt>Total</dt>
                      <dd>{inr(detail.total)}</dd>
                    </div>
                  </dl>
                </div>
                {advanceLabel(detail.status, orderTypeOf(detail)) && (
                  <button
                    type="button"
                    onClick={() => {
                      advance(detail)
                      setDetail(null)
                    }}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
                  >
                    <PartyPopper className="h-4 w-4" />
                    {advanceLabel(detail.status, orderTypeOf(detail))}
                  </button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
