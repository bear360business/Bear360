import { format } from 'date-fns'
import { Check, Info, Pause, Play, Printer, Undo2, UtensilsCrossed } from 'lucide-react'
import { VegMark } from '@/components/app/VegMark'
import { clock, minsLate, stageMeta, varianceLabel, type TicketTiming } from '@/lib/kitchen'
import { getMenuItemById } from '@/lib/mock'
import { orderStatusLabel, orderTypeOf } from '@/lib/order-flow'
import { ORDER_TYPE_META } from '@/lib/service-config'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface KitchenRun {
  /** Seconds the cook has actually spent on this ticket. */
  sec: number
  running: boolean
  started: boolean
}

export interface KitchenCardProps {
  order: Order
  timing: TicketTiming
  run: KitchenRun
  onStart: (order: Order) => void
  onToggleRun: (order: Order) => void
  onDone: (order: Order) => void
  onUndo: (order: Order) => void
  onPrint: (order: Order) => void
}

/**
 * KDS ticket: coloured status header, guest + order type, token + placed time,
 * veg-marked item lines with notes, a target-vs-elapsed progress bar, and one
 * row of glove-sized actions.
 */
export function KitchenCard({
  order,
  timing,
  run,
  onStart,
  onToggleRun,
  onDone,
  onUndo,
  onPrint,
}: KitchenCardProps) {
  const meta = stageMeta(timing.stage)
  const done = timing.stage === 'completed'
  // A cook can pull back a mis-tapped "Mark done" — but only while the front
  // of house hasn't handed it over yet.
  const undoable = order.status === 'ready'
  const type = orderTypeOf(order)
  const typeLabel = ORDER_TYPE_META.find((t) => t.id === type)?.label ?? 'Dine-in'
  // Dine-in → table; counter tickets → type (+ address for delivery).
  const whereLabel =
    type === 'dine-in'
      ? order.tableName || 'Dine-in'
      : type === 'delivery' && order.deliveryAddress
        ? `${typeLabel} · ${order.deliveryAddress}`
        : typeLabel

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {/* Status header */}
      <header className={cn('flex items-center gap-3 px-4 py-3', meta.bar, meta.on)}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <UtensilsCrossed className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {order.customerName ?? 'Walk-in Customer'}
          </span>
          <span className="block truncate text-xs opacity-80">{whereLabel}</span>
        </span>
        <span className="shrink-0 rounded-md bg-white/20 px-2 py-1 text-xs font-semibold tabular-nums">
          #{order.number}
        </span>
      </header>

      {/* Token + placed time */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-xs">
        <span className="font-semibold">
          Token No : <span className="tabular-nums">{order.token}</span>
        </span>
        {done ? (
          // Once the kitchen is out of the loop, show where the order actually
          // is — "Ready" (still on the pass) reads very differently to "Served".
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-semibold text-muted-foreground">
            {orderStatusLabel(order.status, orderTypeOf(order))}
          </span>
        ) : (
          <span className="tabular-nums text-muted-foreground">
            {format(new Date(order.placedAt), 'd MMM yyyy, hh:mm a')}
          </span>
        )}
      </div>

      {/* Items */}
      <ul className="flex-1 divide-y divide-line px-4">
        {order.items.map((item) => {
          const veg = getMenuItemById(item.menuItemId)?.veg ?? true
          return (
            <li key={item.menuItemId} className="py-2.5">
              <div className="flex items-start gap-2.5">
                <VegMark veg={veg} className="mt-0.5" />
                <span className="min-w-0 flex-1 text-sm leading-5">{item.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                  ×{item.qty}
                </span>
              </div>
              {item.note && (
                <p className="ml-6 mt-1.5 flex items-start gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                  <Info className="mt-px h-3 w-3 shrink-0" />
                  Notes : {item.note}
                </p>
              )}
            </li>
          )
        })}
        {order.note && (
          <li className="py-2.5">
            <p className="flex items-start gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-muted-foreground">
              <Info className="mt-px h-3 w-3 shrink-0" />
              Notes : {order.note}
            </p>
          </li>
        )}
      </ul>

      {/* Timing */}
      <div className="px-4 pb-3 pt-2">
        {timing.stage === 'delayed' && (
          <p className="mb-1.5 text-center text-xs font-semibold text-danger">
            Delayed by {minsLate(timing.overSec)} min{minsLate(timing.overSec) === 1 ? '' : 's'}
          </p>
        )}
        {done && timing.varianceSec !== null && (
          <p
            className={cn(
              'mb-1.5 text-center text-xs font-semibold',
              varianceLabel(timing.varianceSec).good ? 'text-success' : 'text-danger',
            )}
          >
            Done in {clock(timing.elapsedSec)} · {varianceLabel(timing.varianceSec).text}
          </p>
        )}
        <div className="flex items-center gap-2.5">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
            aria-valuenow={Math.round(timing.progress * 100)}
            aria-label="Prep time used"
          >
            <div
              className={cn('h-full rounded-full transition-[width] duration-1000', meta.bar)}
              style={{ width: `${Math.max(timing.progress * 100, 2)}%` }}
            />
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-muted-foreground">
            <ClockGlyph />
            {clock(done ? timing.elapsedSec : timing.targetSec)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-line p-3">
        {done ? (
          <>
            {undoable && (
              <ActionButton icon={Undo2} label="Undo" onClick={() => onUndo(order)} />
            )}
            <ActionButton
              icon={Printer}
              label="Print Order"
              onClick={() => onPrint(order)}
              wide={!undoable}
            />
          </>
        ) : (
          <>
            {run.started ? (
              <ActionButton
                icon={run.running ? Pause : Play}
                label={`${run.running ? 'Pause' : 'Resume'} ${clock(run.sec)}`}
                onClick={() => onToggleRun(order)}
              />
            ) : (
              <ActionButton icon={Play} label={`Start ${clock(0)}`} onClick={() => onStart(order)} />
            )}
            <ActionButton icon={Check} label="Mark Done" onClick={() => onDone(order)} />
          </>
        )}
      </div>
    </article>
  )
}

function ClockGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  wide = false,
}: {
  icon: typeof Check
  label: string
  onClick: () => void
  wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-surface text-sm font-medium transition-colors hover:bg-surface-muted active:scale-[0.99]',
        wide ? 'w-full' : 'flex-1',
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      <span className="tabular-nums">{label}</span>
    </button>
  )
}
