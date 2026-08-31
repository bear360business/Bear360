import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Banknote, CreditCard, Flame, Lock, Printer, Search, Smartphone, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/app/PageHeader'
import { QuantityStepper } from '@/components/app/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppearance } from '@/hooks/use-appearance'
import { useAuth } from '@/hooks/use-auth'
import { useOrders } from '@/hooks/use-orders'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import { useServiceConfig } from '@/hooks/use-service-config'
import { useStaff } from '@/hooks/use-staff'
import { resolveStaffCapabilities, type StaffCapabilities } from '@/lib/staff-capabilities'
import { findStaffByLogin, resolvePosPermissions } from '@/lib/staff-access'
import { inr } from '@/lib/currency'
import { useMenu } from '@/hooks/use-menu'
import { useTables } from '@/hooks/use-tables'
import { ORDER_TYPE_META } from '@/lib/service-config'
import { calcGst } from '@/lib/tax'
import type { MenuItem, OrderType } from '@/lib/types'
import { cn } from '@/lib/utils'

const POS_SESSION_KEY = 'bearqr:pos-session'

interface TicketLine {
  item: MenuItem
  qty: number
}

type PayMethod = 'cash' | 'upi' | 'card'

const PAY_METHODS: { id: PayMethod; label: string; icon: typeof Banknote }[] = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
]

/** Green/red veg mark (compact). */
function VegDot({ veg }: { veg: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-3 w-3 items-center justify-center rounded-[2px] border',
        veg ? 'border-success' : 'border-danger',
      )}
    >
      <span className={cn('h-1 w-1 rounded-full', veg ? 'bg-success' : 'bg-danger')} />
    </span>
  )
}

type PosSession = { employeeId: string; name: string }

function readPosSession(): PosSession | null {
  try {
    const raw = sessionStorage.getItem(POS_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PosSession
    if (!parsed?.employeeId) return null
    return { employeeId: parsed.employeeId, name: parsed.name }
  } catch {
    return null
  }
}

/** POS terminal: staff take orders at the counter — menu grid + ticket + GST bill. */
export function PosPage() {
  const { employees } = useStaff()
  const { session: authSession } = useAuth()
  const [session, setSession] = useState<PosSession | null>(() => readPosSession())
  const [manualLock, setManualLock] = useState(false)
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')

  // Staff portal: auto-unlock once after login (not after Lock).
  useEffect(() => {
    if (session || manualLock) return
    if (authSession?.role !== 'staff' || !authSession.employeeId) return
    const emp = employees.find((e) => e.id === authSession.employeeId)
    if (!emp) return
    const perms = resolvePosPermissions(emp)
    if (!perms.posTerminal) return
    const next: PosSession = { employeeId: emp.id, name: emp.name }
    try {
      sessionStorage.setItem(POS_SESSION_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    setSession(next)
  }, [authSession, session, manualLock, employees])

  const unlock = () => {
    const match = findStaffByLogin(phone, pin, employees)
    if (!match) {
      toast.error('Invalid mobile or PIN', {
        description: 'Use the credentials from Staff → POS Staff.',
      })
      return
    }
    const perms = resolvePosPermissions(match)
    if (!perms.posTerminal) {
      toast.error('No POS access', { description: `${match.name} cannot open the terminal.` })
      return
    }
    const next: PosSession = { employeeId: match.id, name: match.name }
    sessionStorage.setItem(POS_SESSION_KEY, JSON.stringify(next))
    setManualLock(false)
    setSession(next)
    setPin('')
    toast.success(`Signed in as ${match.name}`)
  }

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 text-white">
          <Lock className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">POS unlock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter mobile + PIN from Staff → POS Staff.
            {import.meta.env.DEV && (
              <span className="mt-1 block text-xs">
                Demo: Priya · 98765 41002 · 1234
              </span>
            )}
          </p>
        </div>
        <Input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Mobile number"
          className="h-12"
        />
        <Input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && unlock()}
          placeholder="4–6 digit PIN"
          className="h-12 text-center text-lg tracking-[0.3em]"
        />
        <Button
          className="h-11 w-full rounded-full"
          onClick={unlock}
          disabled={pin.length < 4 || phoneDigitsOk(phone) === false}
        >
          Unlock
        </Button>
      </div>
    )
  }

  return (
    <PosTerminal
      cashier={session}
      onLock={() => {
        sessionStorage.removeItem(POS_SESSION_KEY)
        setManualLock(true)
        setSession(null)
      }}
    />
  )
}

function phoneDigitsOk(phone: string) {
  return phone.replace(/\D/g, '').length >= 10
}

function PosTerminal({
  cashier,
  onLock,
}: {
  cashier: PosSession
  onLock: () => void
}) {
  const { employees } = useStaff()
  const employee = employees.find((e) => e.id === cashier.employeeId)
  const caps: StaffCapabilities = employee
    ? resolveStaffCapabilities(employee)
    : {
        modules: {
          posTerminal: false,
          orders: false,
          menu: false,
          expenses: false,
        },
        takeOrders: false,
        acceptPayment: false,
        applyDiscount: false,
        maxDiscountPct: 0,
        voidBill: false,
        viewReports: false,
        manageInventory: false,
        editMenu: false,
        addIncome: false,
      }

  const restaurant = useCurrentVenue()
  const { config: service, enabledOrderTypes } = useServiceConfig()
  const { tables } = useTables()
  const { categories: menuCategories, items: menuItems } = useMenu()
  // The topbar nav layout stacks a 120px header; classic/floating need less clearance.
  const topbar = useAppearance().appearance.navLayout === 'topbar'
  const [lines, setLines] = useState<TicketLine[]>([])
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [orderType, setOrderType] = useState<OrderType>(enabledOrderTypes[0] ?? 'dine-in')
  // Default to the first FREE table so cashiers don't silently bill an occupied one.
  const [tableId, setTableId] = useState('')
  useEffect(() => {
    if (tableId && tables.some((t) => t.id === tableId)) return
    setTableId(tables.find((t) => t.status === 'free')?.id ?? tables[0]?.id ?? '')
  }, [tables, tableId])
  const [address, setAddress] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('cash')
  const [discountPct, setDiscountPct] = useState(0)
  const { placeOrder, setStatus, markPaid, getById } = useOrders()
  // Set once a KOT has been fired for the current ticket, so "Charge" settles
  // that order instead of creating a second one.
  const [sentOrderId, setSentOrderId] = useState<string | null>(null)

  // Reconcile (not just mask) when the admin disables the selected type in
  // another tab — otherwise re-enabling would silently snap the ticket back.
  useEffect(() => {
    if (!enabledOrderTypes.includes(orderType) && enabledOrderTypes.length > 0) {
      setOrderType(enabledOrderTypes[0])
    }
  }, [enabledOrderTypes, orderType])

  const noTypes = enabledOrderTypes.length === 0
  const effectiveType = enabledOrderTypes.includes(orderType)
    ? orderType
    : (enabledOrderTypes[0] ?? 'dine-in')
  const typeOptions = ORDER_TYPE_META.filter((t) => enabledOrderTypes.includes(t.id))

  const visibleItems = useMemo(
    () =>
      menuItems.filter(
        (item) =>
          item.available &&
          (category === 'all' || item.categoryId === category) &&
          (query === '' || item.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [menuItems, category, query],
  )

  const addItem = (item: MenuItem) => {
    if (!caps.takeOrders) {
      toast.error('Not allowed', { description: 'Your role cannot take orders.' })
      return
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.item.id === item.id)
      if (existing) {
        return prev.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l))
      }
      return [...prev, { item, qty: 1 }]
    })
  }

  const setQty = (itemId: string, qty: number) => {
    if (!caps.takeOrders && qty > 0) {
      toast.error('Not allowed', { description: 'Your role cannot change the ticket.' })
      return
    }
    if (qty <= 0 && !caps.voidBill && !caps.takeOrders) {
      toast.error('Not allowed', { description: 'Your role cannot remove items.' })
      return
    }
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.item.id !== itemId)
        : prev.map((l) => (l.item.id === itemId ? { ...l, qty } : l)),
    )
  }

  const subtotal = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0)
  const safeDiscount = caps.applyDiscount
    ? Math.min(Math.max(0, discountPct), caps.maxDiscountPct)
    : 0
  const discountAmt = Math.round((subtotal * safeDiscount) / 100)
  const afterDiscount = Math.max(0, subtotal - discountAmt)
  const deliveryFee = effectiveType === 'delivery' && afterDiscount > 0 ? service.deliveryFee : 0
  const gst = calcGst(afterDiscount + deliveryFee, restaurant.gstRatePct)
  const count = lines.reduce((sum, l) => sum + l.qty, 0)
  const chargeDisabled =
    !caps.acceptPayment ||
    noTypes ||
    lines.length === 0 ||
    (effectiveType === 'delivery' && address.trim() === '')

  const clearTicket = () => {
    if (lines.length > 0 && !caps.voidBill) {
      toast.error('Not allowed', {
        description: 'Your role cannot void / clear a ticket. Ask a manager.',
      })
      return
    }
    setLines([])
    setAddress('')
    setSentOrderId(null)
    setDiscountPct(0)
  }

  /** Builds the order payload shared by "Send KOT" and "Charge". */
  const ticketPayload = (paid: boolean) => {
    const table = tables.find((t) => t.id === tableId)
    return {
      restaurantId: restaurant.id,
      items: lines.map((l) => ({
        menuItemId: l.item.id,
        name: l.item.name,
        qty: l.qty,
        price: l.item.price,
      })),
      orderType: effectiveType,
      channel: 'pos' as const,
      origin: 'pos' as const,
      ...(effectiveType === 'dine-in' && table ? { tableId: table.id, tableName: table.name } : {}),
      ...(effectiveType !== 'dine-in'
        ? {
            tableName:
              effectiveType === 'delivery' ? 'Delivery' : 'POS · Takeaway',
          }
        : {}),
      ...(effectiveType === 'delivery' && address.trim()
        ? { deliveryAddress: address.trim() }
        : {}),
      gstRatePct: restaurant.gstRatePct,
      deliveryFee,
      paid,
    }
  }

  /**
   * KOT = fire the food without settling the bill. Standard for dine-in: the
   * kitchen starts now, the guest pays on the way out.
   */
  const needsAddress = effectiveType === 'delivery' && address.trim() === ''

  const sendKot = async () => {
    if (!caps.takeOrders) {
      toast.error('Not allowed', { description: 'Your role cannot send orders to kitchen.' })
      return
    }
    if (needsAddress) {
      toast.error('Add a delivery address before sending KOT')
      return
    }
    const order = await placeOrder(ticketPayload(false))
    setSentOrderId(order.id)
    const typeLabel = ORDER_TYPE_META.find((t) => t.id === effectiveType)?.label ?? effectiveType
    toast.success(`KOT sent · Order #${order.number}`, {
      description:
        effectiveType === 'dine-in'
          ? `${tables.find((t) => t.id === tableId)?.name ?? 'Counter'} · on the kitchen display`
          : `${typeLabel} · on the kitchen display — settle when ready`,
    })
  }

  const charge = async () => {
    if (!caps.acceptPayment) {
      toast.error('Not allowed', { description: 'Your role cannot accept payment.' })
      return
    }
    if (needsAddress && !sentOrderId) {
      toast.error('Add a delivery address')
      return
    }
    // Already fired to the kitchen? Just settle it — don't create a duplicate.
    if (sentOrderId) {
      setStatus(sentOrderId, 'served')
      markPaid(sentOrderId)
      const num = getById(sentOrderId)?.number
      toast.success(`Order #${num} charged ${inr(gst.total)}`, {
        description: `${PAY_METHODS.find((m) => m.id === payMethod)?.label} · settled`,
      })
    } else {
      if (!caps.takeOrders) {
        toast.error('Not allowed', { description: 'Your role cannot create orders.' })
        return
      }
      const order = await placeOrder(ticketPayload(true))
      toast.success(`Order #${order.number} charged ${inr(gst.total)}`, {
        description: `${PAY_METHODS.find((m) => m.id === payMethod)?.label} · ${
          ORDER_TYPE_META.find((t) => t.id === effectiveType)?.label
        }${effectiveType === 'dine-in' ? ` · ${tables.find((t) => t.id === tableId)?.name ?? ''}` : ''} — sent to kitchen`,
      })
    }
    setLines([])
    setAddress('')
    setSentOrderId(null)
    setDiscountPct(0)
  }

  return (
    <>
      <PageHeader
        title="POS"
        caption={
          service.deductStockOnPaid
            ? `Counter billing · ${cashier.name} — stock deducts on payment`
            : `Counter billing · ${cashier.name} — stock deducts when kitchen marks done`
        }
        actions={
          <Button type="button" variant="outline" className="rounded-full" onClick={onLock}>
            <Lock className="h-4 w-4" />
            Lock
          </Button>
        }
      />

      {(!caps.takeOrders || !caps.acceptPayment) && (
        <p className="mb-4 rounded-card border border-warning/40 bg-warning-tint/40 px-4 py-2.5 text-xs text-foreground">
          Role limits apply
          {!caps.takeOrders ? ' · cannot take orders' : ''}
          {!caps.acceptPayment ? ' · cannot accept payment' : ''}
          {!caps.voidBill ? ' · cannot void tickets' : ''}
          {caps.applyDiscount ? ` · discount up to ${caps.maxDiscountPct}%` : ' · no discount'}
          . Change under Staff → Roles.
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-12">
        {/* ---- Menu picker ---- */}
        <div className="space-y-4 xl:col-span-7 2xl:col-span-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dishes…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 text-sm transition-colors',
                category === 'all'
                  ? 'bg-brand font-semibold text-brand-foreground'
                  : 'border border-line bg-surface font-medium text-muted-foreground hover:text-foreground',
              )}
            >
              All
            </button>
            {menuCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  'h-9 shrink-0 rounded-full px-4 text-sm transition-colors',
                  category === c.id
                    ? 'bg-brand font-semibold text-brand-foreground'
                    : 'border border-line bg-surface font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 2xl:grid-cols-4">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!item.available || !caps.takeOrders}
                onClick={() => addItem(item)}
                className={cn(
                  'flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface text-left shadow-card transition-all hover:border-brand hover:shadow-raised active:scale-[0.98]',
                  (!item.available || !caps.takeOrders) && 'pointer-events-none opacity-50',
                )}
              >
                <span className="relative block h-28 w-full shrink-0 overflow-hidden bg-surface-muted sm:h-32">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-3xl text-muted-foreground">
                      🍽️
                    </span>
                  )}
                  <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-surface/90 px-1.5 py-1 shadow-sm backdrop-blur-sm">
                    {item.spicy && <Flame className="h-3 w-3 text-warning" />}
                    <VegDot veg={item.veg} />
                  </span>
                  {!item.available && (
                    <span className="absolute inset-x-0 bottom-0 z-10 bg-ink-900/70 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                      Sold out
                    </span>
                  )}
                </span>
                <span className="flex min-h-[4.5rem] flex-1 flex-col gap-1 p-3">
                  <span className="line-clamp-2 text-sm font-medium leading-5">{item.name}</span>
                  <span className="mt-auto text-sm font-semibold">{inr(item.price)}</span>
                </span>
              </button>
            ))}
            {visibleItems.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {query
                    ? `No dishes match "${query}"`
                    : menuItems.length === 0
                      ? 'No dishes added yet. Add items in Menu to start taking orders.'
                      : 'No available dishes in this category.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---- Ticket ---- */}
        <div
          className={cn(
            'order-first rounded-card border border-line bg-surface shadow-card xl:order-none xl:sticky xl:col-span-5 xl:overflow-y-auto 2xl:col-span-4',
            topbar
              ? 'xl:top-[136px] xl:max-h-[calc(100vh-10rem)]'
              : 'xl:top-24 xl:max-h-[calc(100vh-7.5rem)]',
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">
              Current order{' '}
              {count > 0 && (
                <span className="text-muted-foreground">
                  · {count} item{count === 1 ? '' : 's'}
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={clearTicket}
              disabled={lines.length === 0}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger disabled:opacity-40"
              title="Clear ticket"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            {/* Order type */}
            {typeOptions.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {typeOptions.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setOrderType(type.id)}
                    className={cn(
                      'rounded-xl border px-2 py-1.5 text-xs transition-colors',
                      effectiveType === type.id
                        ? 'border-brand bg-brand-tint font-semibold'
                        : 'border-line font-medium text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {type.emoji} {type.label}
                  </button>
                ))}
              </div>
            )}

            {noTypes && (
              <p className="rounded-xl bg-warning-tint px-3 py-2 text-center text-xs font-medium text-warning">
                All order types are disabled in Settings → Service
              </p>
            )}

            {!noTypes && effectiveType === 'dine-in' && (
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.seats} seats{t.status === 'occupied' ? ' · occupied' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!noTypes && effectiveType === 'delivery' && (
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Delivery address…"
                className="h-9"
              />
            )}

            {/* Lines */}
            {lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tap dishes to add them to the ticket
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {lines.map((line) => (
                  <li key={line.item.id} className="flex items-center gap-2 py-2.5">
                    {line.item.image ? (
                      <img
                        src={line.item.image}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-sm">
                        🍽️
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{line.item.name}</span>
                    <QuantityStepper
                      value={line.qty}
                      onChange={(qty) => setQty(line.item.id, qty)}
                      size="sm"
                    />
                    <span className="w-16 text-right text-sm font-semibold">
                      {inr(line.item.price * line.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Bill */}
            {lines.length > 0 && caps.applyDiscount && (
              <div className="space-y-1.5 border-t border-line pt-3">
                <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Discount % (max {caps.maxDiscountPct})</span>
                  <Input
                    type="number"
                    min={0}
                    max={caps.maxDiscountPct}
                    value={discountPct || ''}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      setDiscountPct(
                        Number.isFinite(n)
                          ? Math.min(Math.max(0, n), caps.maxDiscountPct)
                          : 0,
                      )
                    }}
                    className="h-8 w-20 text-right"
                  />
                </label>
              </div>
            )}

            {lines.length > 0 && (
              <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{inr(subtotal)}</dd>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-success">
                    <dt>Discount ({safeDiscount}%)</dt>
                    <dd>−{inr(discountAmt)}</dd>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Delivery fee</dt>
                    <dd>{inr(deliveryFee)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">CGST ({gst.cgstPct}%)</dt>
                  <dd>{inr(gst.cgst)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">SGST ({gst.sgstPct}%)</dt>
                  <dd>{inr(gst.sgst)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-1.5 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{inr(gst.total)}</dd>
                </div>
              </dl>
            )}

            {/* Payment */}
            <div className="grid grid-cols-3 gap-1.5">
              {PAY_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPayMethod(method.id)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs transition-colors',
                    payMethod === method.id
                      ? 'border-brand bg-brand-tint font-semibold'
                      : 'border-line font-medium text-muted-foreground hover:text-foreground',
                  )}
                >
                  <method.icon className="h-3.5 w-3.5" />
                  {method.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={chargeDisabled}
              onClick={charge}
              className="flex h-12 w-full items-center justify-center rounded-full bg-brand text-base font-semibold text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {!caps.acceptPayment
                ? 'Payment not allowed for your role'
                : noTypes
                  ? 'Order types disabled'
                  : lines.length === 0
                    ? 'Add items to charge'
                    : effectiveType === 'delivery' && address.trim() === ''
                      ? 'Add delivery address'
                      : `Charge · ${inr(gst.total)}`}
            </button>
            <button
              type="button"
              disabled={
                !caps.takeOrders ||
                lines.length === 0 ||
                sentOrderId !== null ||
                noTypes ||
                needsAddress
              }
              onClick={sendKot}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-line text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              {!caps.takeOrders
                ? 'Ordering not allowed'
                : sentOrderId
                  ? 'KOT sent — awaiting payment'
                  : needsAddress
                    ? 'Add delivery address'
                    : 'Send KOT (pay later)'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
