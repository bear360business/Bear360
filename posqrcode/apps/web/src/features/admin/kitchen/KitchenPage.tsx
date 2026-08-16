import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  RotateCw,
  Search,
  X,
} from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { KitchenCard, type KitchenRun } from '@/components/app/KitchenCard'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { Input } from '@/components/ui/input'
import { useOrders } from '@/hooks/use-orders'
import { usePageState } from '@/hooks/use-page-state'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { KITCHEN_STAGES, ticketTiming, type KitchenStage } from '@/lib/kitchen'
import type { Order } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Completed tickets drop off the main board after this long — the board is a
 *  to-do list, not a log. They stay reachable under the Completed filter. */
const ARCHIVE_AFTER_MS = 10 * 60 * 1000

const CHIME_KEY = 'bearqr:kds-chime'

/** Short two-tone chime via WebAudio — no asset, no network. */
function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.16)
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.16 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.15)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.16)
      osc.stop(now + i * 0.16 + 0.16)
    }
    setTimeout(() => ctx.close(), 800)
  } catch {
    // audio blocked or unsupported — the visual board still updates
  }
}

const stageIcon: Record<KitchenStage, typeof ChefHat> = {
  new: ClipboardList,
  'in-kitchen': ChefHat,
  delayed: AlertCircle,
  completed: CheckCircle2,
}

/** Full-screen kitchen display: stage filters, live tickets, big touch targets. */
export function KitchenPage() {
  const state = usePageState()
  const { config } = usePlatformConfig()
  const { orders, setStatus, rollback } = useOrders()
  const [now, setNow] = useState(() => Date.now())
  const [filter, setFilter] = useState<KitchenStage | null>(null)
  const [query, setQuery] = useState('')
  const [chime, setChime] = useState(() => {
    try {
      const notifs = localStorage.getItem('bearqr:notifications')
      if (notifs) {
        const parsed = JSON.parse(notifs) as { 'order-sound'?: boolean }
        if (typeof parsed['order-sound'] === 'boolean') return parsed['order-sound']
      }
    } catch {
      /* ignore */
    }
    return localStorage.getItem(CHIME_KEY) !== 'off'
  })

  useEffect(() => {
    const sync = () => {
      try {
        const notifs = localStorage.getItem('bearqr:notifications')
        if (notifs) {
          const parsed = JSON.parse(notifs) as { 'order-sound'?: boolean }
          if (typeof parsed['order-sound'] === 'boolean') {
            setChime(parsed['order-sound'])
            return
          }
        }
      } catch {
        /* ignore */
      }
      setChime(localStorage.getItem(CHIME_KEY) !== 'off')
    }
    window.addEventListener('bearqr:notif-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('bearqr:notif-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  // Per-ticket cook timer, independent of the since-placed clock: a cook can
  // pause when they're blocked and the elapsed target keeps running regardless.
  const [runs, setRuns] = useState<Record<string, KitchenRun>>(() =>
    Object.fromEntries(
      orders
        .filter((o) => o.status === 'preparing')
        .map((o) => [
          o.id,
          {
            sec: Math.max(0, Math.floor((Date.now() - new Date(o.placedAt).getTime()) / 1000)),
            running: true,
            started: true,
          },
        ]),
    ),
  )

  // Ring once per genuinely new ticket — including ones placed from the QR app
  // or the POS in another tab.
  const knownIds = useRef<Set<string> | null>(null)
  useEffect(() => {
    const pendingIds = orders.filter((o) => o.status === 'pending').map((o) => o.id)
    if (knownIds.current === null) {
      knownIds.current = new Set(pendingIds)
      return
    }
    const fresh = pendingIds.filter((id) => !knownIds.current!.has(id))
    knownIds.current = new Set(pendingIds)
    if (fresh.length > 0 && chime) playChime()
  }, [orders, chime])

  // One 1s tick drives every timer on the board.
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
      setRuns((prev) => {
        const running = Object.entries(prev).filter(([, r]) => r.running)
        if (running.length === 0) return prev
        const next = { ...prev }
        for (const [id, r] of running) next[id] = { ...r, sec: r.sec + 1 }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const tickets = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'cancelled')
        .map((order) => ({ order, timing: ticketTiming(order, now) }))
        // Delayed first, then oldest first — the board reads top-left as "do this next".
        .sort((a, b) => {
          if (a.timing.stage === 'delayed' !== (b.timing.stage === 'delayed'))
            return a.timing.stage === 'delayed' ? -1 : 1
          if ((a.timing.stage === 'completed') !== (b.timing.stage === 'completed'))
            return a.timing.stage === 'completed' ? 1 : -1
          return a.order.placedAt.localeCompare(b.order.placedAt)
        }),
    [orders, now],
  )

  const counts = useMemo(() => {
    const base: Record<KitchenStage, number> = {
      new: 0,
      'in-kitchen': 0,
      delayed: 0,
      completed: 0,
    }
    for (const t of tickets) base[t.timing.stage] += 1
    return base
  }, [tickets])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets.filter(
      ({ order, timing }) =>
        (filter === null
          ? // Main board = what still needs doing, plus anything finished in the
            // last few minutes. Older tickets live under the Completed filter.
            timing.stage !== 'completed' ||
            now - new Date(order.servedAt ?? order.placedAt).getTime() < ARCHIVE_AFTER_MS
          : timing.stage === filter) &&
        (q === '' ||
          String(order.number).includes(q) ||
          order.token.toLowerCase().includes(q) ||
          (order.customerName ?? '').toLowerCase().includes(q) ||
          order.tableName.toLowerCase().includes(q) ||
          order.items.some((i) => i.name.toLowerCase().includes(q))),
    )
  }, [tickets, filter, query, now])

  const archivedCount = useMemo(
    () => counts.completed - visible.filter((t) => t.timing.stage === 'completed').length,
    [counts.completed, visible],
  )

  const start = (order: Order) => {
    setRuns((prev) => ({ ...prev, [order.id]: { sec: 0, running: true, started: true } }))
    setStatus(order.id, 'preparing')
  }

  const toggleRun = (order: Order) =>
    setRuns((prev) => {
      const r = prev[order.id] ?? { sec: 0, running: false, started: true }
      return { ...prev, [order.id]: { ...r, running: !r.running } }
    })

  const markDone = (order: Order) => {
    setRuns((prev) => ({
      ...prev,
      [order.id]: { ...(prev[order.id] ?? { sec: 0, started: true }), running: false },
    }))
    setStatus(order.id, 'ready')
    toast.success(`#${order.number} ready`, {
      description: order.customerName ?? order.tableName,
      action: { label: 'Undo', onClick: () => undo(order) },
    })
  }

  /** Pull a ticket back onto the line — mis-taps happen with wet gloves. */
  const undo = (order: Order) => {
    rollback(order.id)
    setRuns((prev) => ({
      ...prev,
      [order.id]: { ...(prev[order.id] ?? { sec: 0, started: true }), running: true },
    }))
  }

  const print = (order: Order) => toast(`Sending ticket #${order.number} to the printer…`)

  const refresh = () => {
    setNow(Date.now())
    toast.success('Board refreshed')
  }

  const toggleChime = () => {
    const next = !chime
    setChime(next)
    localStorage.setItem(CHIME_KEY, next ? 'on' : 'off')
    try {
      const raw = localStorage.getItem('bearqr:notifications')
      const parsed = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
      localStorage.setItem(
        'bearqr:notifications',
        JSON.stringify({ ...parsed, 'order-sound': next }),
      )
      window.dispatchEvent(new Event('bearqr:notif-changed'))
    } catch {
      /* ignore */
    }
    if (next) playChime() // the click is the gesture that unlocks audio
  }

  // Platform control: super admin can disable the KDS live.
  if (!config.service.kitchenDisplay) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <EmptyState
          illustration={
            <p className="mb-6 text-6xl" aria-hidden>
              🔒
            </p>
          }
          title="Kitchen display is turned off"
          description="A platform admin disabled the KDS. Re-enable it in Super Admin → Settings → Platform controls."
          action={
            <Link
              to="/dashboard"
              className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              Back to dashboard
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Board header: title · stage filters · search */}
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          Kitchen
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh board"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleChime}
            aria-label={chime ? 'Mute new-order sound' : 'Unmute new-order sound'}
            aria-pressed={chime}
            title={chime ? 'New-order sound on' : 'New-order sound muted'}
            className={cn(
              'rounded-full p-1.5 transition-colors hover:bg-surface-muted',
              chime ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {chime ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          {KITCHEN_STAGES.map((stage) => {
            const Icon = stageIcon[stage.id]
            const active = filter === stage.id
            return (
              <button
                key={stage.id}
                type="button"
                data-stage={stage.id}
                aria-pressed={active}
                onClick={() => setFilter(active ? null : stage.id)}
                className={cn(
                  'flex h-11 items-center gap-2 rounded-full border pl-1.5 pr-4 text-sm font-medium transition-colors',
                  active
                    ? 'border-transparent bg-foreground text-background'
                    : 'border-line bg-surface hover:bg-surface-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    stage.tint,
                    stage.text,
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {stage.label}
                <span className="font-display font-bold tabular-nums">
                  {String(counts[stage.id]).padStart(2, '0')}
                </span>
              </button>
            )
          })}
          {filter !== null && (
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        <div className="relative ml-auto min-w-[200px] max-w-xs flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-11 rounded-full pr-10"
            aria-label="Search tickets"
          />
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </header>

      {state === 'loading' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LoadingSkeleton variant="kitchen" count={3} />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <EmptyState
            illustration={<p className="mb-6 text-6xl">👨‍🍳</p>}
            title={
              query || filter
                ? 'No tickets match'
                : 'All caught up'
            }
            description={
              query || filter
                ? 'Try a different search, or clear the stage filter.'
                : 'New orders appear here the moment they’re placed.'
            }
            action={
              query || filter ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setFilter(null)
                  }}
                  className="inline-flex h-11 items-center rounded-full border border-line px-6 text-sm font-semibold transition-colors hover:bg-surface-muted"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ order, timing }) => (
            <KitchenCard
              key={order.id}
              order={order}
              timing={timing}
              run={runs[order.id] ?? { sec: 0, running: false, started: false }}
              onStart={start}
              onToggleRun={toggleRun}
              onDone={markDone}
              onUndo={undo}
              onPrint={print}
            />
          ))}
        </div>
      )}

      {filter === null && archivedCount > 0 && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {archivedCount} completed ticket{archivedCount === 1 ? '' : 's'} archived ·{' '}
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className="font-semibold underline underline-offset-2 hover:text-foreground"
          >
            show all completed
          </button>
        </p>
      )}
    </div>
  )
}
