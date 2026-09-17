import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Banknote,
  CreditCard,
  Flame,
  Lock,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react'
import { QuantityStepper } from '@/components/app/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PosBillingList } from './PosBillingList'
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
import { apiPosUnlock } from '@/lib/api-catalog'
import { useMockData } from '@/lib/runtime-config'
import { resolveDataVenueId } from '@/lib/venue-scope'
import { inr } from '@/lib/currency'
import { useMenu } from '@/hooks/use-menu'
import { useTables } from '@/hooks/use-tables'
import { ORDER_TYPE_META } from '@/lib/service-config'
import { calcGst } from '@/lib/tax'
import type { MenuItem, OrderType } from '@/lib/types'
import { cn } from '@/lib/utils'

const POS_SESSION_KEY = 'bearqr:pos-session'
const POS_PIN_REQUIRED_KEY = 'bearqr:pos:pin_required'

function isPinLockRequired(): boolean {
  try {
    const val = localStorage.getItem(POS_PIN_REQUIRED_KEY)
    return val !== 'false'
  } catch {
    return true
  }
}

const ADMIN_CAPABILITIES: StaffCapabilities = {
  modules: {
    posTerminal: true,
    orders: true,
    menu: true,
    expenses: true,
  },
  takeOrders: true,
  acceptPayment: true,
  applyDiscount: true,
  maxDiscountPct: 100,
  voidBill: true,
  viewReports: true,
  manageInventory: true,
  editMenu: true,
  addIncome: true,
}

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
  const mock = useMockData()
  const [session, setSession] = useState<PosSession | null>(() => readPosSession())
  const [manualLock, setManualLock] = useState(false)
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [pinRequired, setPinRequired] = useState<boolean>(() => isPinLockRequired())

  const isAdmin = authSession?.role === 'restaurant' || authSession?.role === 'super'

  const adminSession: PosSession = useMemo(
    () => ({
      employeeId: 'admin',
      name: authSession?.email ? authSession.email.split('@')[0] : 'Admin (Owner)',
    }),
    [authSession?.email],
  )

  const handleAdminUnlock = () => {
    try {
      sessionStorage.setItem(POS_SESSION_KEY, JSON.stringify(adminSession))
    } catch {
      /* ignore */
    }
    setManualLock(false)
    setSession(adminSession)
    setPin('')
    toast.success(`Signed in as ${adminSession.name}`)
  }

  const togglePinRequired = () => {
    const next = !pinRequired
    setPinRequired(next)
    try {
      localStorage.setItem(POS_PIN_REQUIRED_KEY, next ? 'true' : 'false')
    } catch {
      /* ignore */
    }
    toast.success(next ? 'POS PIN lock enabled (PIN ON)' : 'POS PIN lock disabled (PIN OFF)')
    if (!next) {
      handleAdminUnlock()
    }
  }

  // Auto-open if PIN lock is turned OFF by admin
  useEffect(() => {
    if (!pinRequired && !session && !manualLock && isAdmin) {
      handleAdminUnlock()
    }
  }, [pinRequired, session, manualLock, isAdmin])

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

  const unlock = async () => {
    if (unlocking) return
    // Mock / demo mode: validate locally against in-memory staff list
    if (mock) {
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
      return
    }
    // Live mode: verify phone + PIN on the backend (argon2)
    setUnlocking(true)
    try {
      const restaurantId = resolveDataVenueId()
      const emp = await apiPosUnlock(restaurantId, phone, pin)
      const next: PosSession = { employeeId: emp.id, name: emp.name }
      sessionStorage.setItem(POS_SESSION_KEY, JSON.stringify(next))
      setManualLock(false)
      setSession(next)
      setPin('')
      toast.success(`Signed in as ${emp.name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unlock failed'
      toast.error(msg.includes('NO_POS_ACCESS') ? 'No POS terminal access' : 'Invalid mobile or PIN', {
        description: msg.includes('NO_POS_ACCESS')
          ? 'Ask admin to enable POS access in Staff → POS Staff.'
          : 'Check your mobile number and PIN in Staff → POS Staff.',
      })
    } finally {
      setUnlocking(false)
    }
  }

  // Admin login has direct full access — only staff without active session see the unlock screen
  if (!isAdmin && !session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-8 sm:py-16">
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
        <div className="w-full space-y-1">
          <Input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile number"
            className="h-12"
          />
          {phone.includes('@') && isAdmin && (
            <p className="text-xs text-brand text-center pt-1">
              You entered your email. Use the "Unlock as Admin" button below!
            </p>
          )}
        </div>
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
          disabled={unlocking || pin.length < 4 || phoneDigitsOk(phone) === false}
        >
          {unlocking ? 'Checking…' : 'Unlock'}
        </Button>

        {/* Admin Controls: Unlock as Admin & Turn PIN OFF */}
        {isAdmin && (
          <div className="mt-3 w-full space-y-3 rounded-2xl border border-line bg-surface-muted/40 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Admin Control</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  pinRequired ? 'bg-amber-500/10 text-amber-600' : 'bg-success/10 text-success'
                }`}
              >
                PIN is {pinRequired ? 'ON' : 'OFF'}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-full border-brand/50 bg-brand/5 font-semibold text-foreground hover:bg-brand/15"
              onClick={handleAdminUnlock}
            >
              <ShieldCheck className="mr-2 h-4 w-4 text-brand" />
              Unlock as Admin ({authSession?.email?.split('@')[0] || 'Owner'})
            </Button>

            <div className="flex items-center justify-between border-t border-line/60 pt-2">
              <div className="text-left">
                <p className="text-xs font-medium text-foreground">PIN Lock Requirement</p>
                <p className="text-[11px] text-muted-foreground">
                  {pinRequired ? 'Staff must enter PIN to unlock' : 'PIN lock is OFF · POS opens directly'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={pinRequired ? 'secondary' : 'default'}
                className="rounded-lg text-xs"
                onClick={togglePinRequired}
              >
                {pinRequired ? 'Turn PIN OFF' : 'Turn PIN ON'}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <PosTerminal
      cashier={session ?? (isAdmin ? adminSession : { employeeId: 'staff', name: 'Cashier' })}
      isAdmin={isAdmin}
      onLock={
        isAdmin
          ? undefined
          : () => {
              sessionStorage.removeItem(POS_SESSION_KEY)
              setManualLock(true)
              setSession(null)
            }
      }
    />
  )
}

function phoneDigitsOk(phone: string) {
  return phone.replace(/\D/g, '').length >= 10
}

function PosTerminal({
  cashier,
  isAdmin,
  onLock,
}: {
  cashier: PosSession
  isAdmin?: boolean
  onLock?: () => void
}) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'bills'>('terminal')
  const [mobileTicketOpen, setMobileTicketOpen] = useState(false)

  const { employees } = useStaff()
  const employee = employees.find((e) => e.id === cashier.employeeId)
  const caps: StaffCapabilities =
    cashier.employeeId === 'admin'
      ? ADMIN_CAPABILITIES
      : employee
        ? resolveStaffCapabilities(employee)
        : ADMIN_CAPABILITIES

  const restaurant = useCurrentVenue()
  const { config: service, enabledOrderTypes } = useServiceConfig()
  const { tables } = useTables()
  const { categories: menuCategories, items: menuItems } = useMenu()
  const topbar = useAppearance().appearance.navLayout === 'topbar'
  const [lines, setLines] = useState<TicketLine[]>([])
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [orderType, setOrderType] = useState<OrderType>(enabledOrderTypes[0] ?? 'dine-in')
  const [tableId, setTableId] = useState('')

  useEffect(() => {
    if (tableId && tables.some((t) => t.id === tableId)) return
    setTableId(tables.find((t) => t.status === 'free')?.id ?? tables[0]?.id ?? '')
  }, [tables, tableId])

  const [address, setAddress] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('cash')
  const [discountPct, setDiscountPct] = useState(0)
  const { placeOrder, markPaid, getById, orders, isOnline, pendingSyncCount, syncPending } =
    useOrders()
  const [sentOrderId, setSentOrderId] = useState<string | null>(null)

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

  const getItemQty = (itemId: string) => {
    return lines.find((l) => l.item.id === itemId)?.qty ?? 0
  }

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
    setMobileTicketOpen(false)
  }

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
      paymentMethod: payMethod,
      gstRatePct: restaurant.gstRatePct,
      deliveryFee,
      paid,
    }
  }

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
    setMobileTicketOpen(false)
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
    if (sentOrderId) {
      markPaid(sentOrderId, payMethod)
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
    setMobileTicketOpen(false)
  }

  const renderTicketCard = (isMobileSheet = false) => (
    <div
      className={cn(
        'rounded-card border border-line bg-surface shadow-card',
        isMobileSheet && 'border-none shadow-none pb-6',
      )}
    >
      {isMobileSheet && (
        <div className="mx-auto mt-2.5 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
      )}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">
          Current order{' '}
          {count > 0 && (
            <span className="text-muted-foreground">
              · {count} item{count === 1 ? '' : 's'}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearTicket}
            disabled={lines.length === 0}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-danger disabled:opacity-40"
            title="Clear ticket"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {isMobileSheet && (
            <button
              type="button"
              onClick={() => setMobileTicketOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select Table" />
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
            className="h-9 text-xs"
          />
        )}

        {/* Lines */}
        {lines.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground space-y-1">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="font-medium">No items in ticket</p>
            <p className="text-xs">Tap dishes on the menu to add them</p>
          </div>
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-medium">{line.item.name}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums">
                      {inr(line.item.price * line.qty)}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {inr(line.item.price)} each
                  </span>
                </div>
                <QuantityStepper
                  value={line.qty}
                  onChange={(qty) => setQty(line.item.id, qty)}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Discount & Totals */}
        {lines.length > 0 && (
          <dl className="space-y-1.5 border-t border-line pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{inr(subtotal)}</dd>
            </div>
            {caps.applyDiscount && (
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <dt>Discount</dt>
                <dd className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={caps.maxDiscountPct}
                    value={discountPct || ''}
                    onChange={(e) => setDiscountPct(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-7 w-16 text-right text-xs"
                  />
                  <span>%</span>
                  {discountAmt > 0 && (
                    <span className="text-success tabular-nums">(-{inr(discountAmt)})</span>
                  )}
                </dd>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Delivery fee</dt>
                <dd className="tabular-nums">{inr(deliveryFee)}</dd>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <dt>CGST ({gst.cgstPct}%)</dt>
              <dd className="tabular-nums">{inr(gst.cgst)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>SGST ({gst.sgstPct}%)</dt>
              <dd className="tabular-nums">{inr(gst.sgst)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{inr(gst.total)}</dd>
            </div>
          </dl>
        )}

        {/* Payment */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
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
  )

  return (
    <>
      {/* Header & Tabs Bar */}
      <div className="mb-4 space-y-3">
        {/* Top bar with Title, Cashier info, and Lock/PIN buttons */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                POS
              </h1>
              <span className="inline-flex items-center rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand-foreground">
                {cashier.name}
              </span>
              {!isOnline ? (
                <button
                  type="button"
                  onClick={() => void syncPending()}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                  title="Offline mode. Click to retry syncing pending orders."
                >
                  <WifiOff className="h-3 w-3" />
                  <span>Offline{pendingSyncCount > 0 ? ` (${pendingSyncCount})` : ''}</span>
                </button>
              ) : pendingSyncCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void syncPending()}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 animate-pulse"
                  title="Syncing pending orders to cloud..."
                >
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Syncing ({pendingSyncCount})</span>
                </button>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Cloud Active</span>
                </span>
              )}
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {service.deductStockOnPaid
                ? 'Counter billing · Stock deducts on payment'
                : 'Counter billing · Stock deducts when marked served'}
            </p>
          </div>

          {!isAdmin && onLock && (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-2.5 text-xs font-medium"
                onClick={onLock}
              >
                <Lock className="mr-1 h-3.5 w-3.5" />
                Lock
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Tabs (Counter Terminal vs Billing List) */}
        <div className="flex items-center rounded-xl border border-line bg-surface p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all',
              activeTab === 'terminal'
                ? 'bg-brand text-brand-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Store className="h-4 w-4" />
            <span>Counter Terminal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all',
              activeTab === 'bills'
                ? 'bg-brand text-brand-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Receipt className="h-4 w-4" />
            <span>Billing List</span>
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                activeTab === 'bills'
                  ? 'bg-brand-foreground/20 text-brand-foreground'
                  : 'bg-surface-muted text-muted-foreground',
              )}
            >
              {orders.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'bills' ? (
        <PosBillingList onNewBill={() => setActiveTab('terminal')} />
      ) : (
        <>
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
            <div className="space-y-4 xl:col-span-7 2xl:col-span-8 pb-28 xl:pb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search dishes…"
                    className="h-10 rounded-xl pl-9 pr-9 text-sm"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                <button
                  type="button"
                  onClick={() => setCategory('all')}
                  className={cn(
                    'h-9 shrink-0 rounded-full px-4 text-xs sm:text-sm font-semibold transition-colors',
                    category === 'all'
                      ? 'bg-brand text-brand-foreground shadow-sm'
                      : 'border border-line bg-surface text-muted-foreground hover:text-foreground',
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
                      'h-9 shrink-0 rounded-full px-4 text-xs sm:text-sm font-semibold transition-colors',
                      category === c.id
                        ? 'bg-brand text-brand-foreground shadow-sm'
                        : 'border border-line bg-surface text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-2 items-stretch gap-2.5 sm:gap-3 sm:grid-cols-3 2xl:grid-cols-4">
                {visibleItems.map((item) => {
                  const inCartQty = getItemQty(item.id)
                  return (
                    <div
                      key={item.id}
                      onClick={() => item.available && caps.takeOrders && addItem(item)}
                      className={cn(
                        'group relative flex h-full flex-col overflow-hidden rounded-2xl border text-left transition-all cursor-pointer select-none active:scale-[0.98]',
                        inCartQty > 0
                          ? 'border-brand ring-2 ring-brand/40 bg-surface shadow-md'
                          : 'border-line bg-surface shadow-card hover:border-brand/60 hover:shadow-raised',
                        (!item.available || !caps.takeOrders) && 'pointer-events-none opacity-50',
                      )}
                    >
                      {/* Image container */}
                      <div className="relative block h-28 w-full shrink-0 overflow-hidden bg-surface-muted sm:h-32">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-3xl text-muted-foreground">
                            🍽️
                          </span>
                        )}

                        {/* Top-left in-cart badge */}
                        {inCartQty > 0 && (
                          <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-brand-foreground shadow-md animate-in zoom-in-50">
                            ✓ {inCartQty} in ticket
                          </span>
                        )}

                        {/* Top-right badges (spicy & veg) */}
                        <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-surface/90 px-1.5 py-1 shadow-sm backdrop-blur-sm">
                          {item.spicy && <Flame className="h-3 w-3 text-warning" />}
                          <VegDot veg={item.veg} />
                        </span>

                        {!item.available && (
                          <span className="absolute inset-x-0 bottom-0 z-10 bg-ink-900/70 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                            Sold out
                          </span>
                        )}
                      </div>

                      {/* Content & Action */}
                      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3">
                        <span className="line-clamp-2 text-xs sm:text-sm font-semibold leading-snug text-foreground">
                          {item.name}
                        </span>

                        <div className="mt-2.5 flex items-center justify-between gap-1">
                          <span className="text-xs sm:text-sm font-bold text-foreground">
                            {inr(item.price)}
                          </span>

                          {/* Stepper on card if in cart, or + Add badge */}
                          {inCartQty > 0 ? (
                            <div
                              className="flex items-center gap-1 rounded-lg border border-brand/30 bg-brand-tint/30 p-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setQty(item.id, inCartQty - 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-surface font-bold text-foreground shadow-sm hover:bg-surface-muted active:scale-90"
                              >
                                -
                              </button>
                              <span className="w-5 text-center text-xs font-bold text-brand-foreground">
                                {inCartQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(item.id, inCartQty + 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-brand font-bold text-brand-foreground shadow-sm hover:bg-brand-hover active:scale-90"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex h-6 items-center rounded-lg bg-surface-muted px-2 text-[11px] font-semibold text-muted-foreground transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                              + Add
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
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

            {/* ---- Desktop Ticket (Right sidebar, sticky on xl+) ---- */}
            <div
              className={cn(
                'hidden xl:block rounded-card border border-line bg-surface shadow-card xl:sticky xl:col-span-5 xl:overflow-y-auto 2xl:col-span-4',
                topbar
                  ? 'xl:top-[136px] xl:max-h-[calc(100vh-10rem)]'
                  : 'xl:top-24 xl:max-h-[calc(100vh-7.5rem)]',
              )}
            >
              {renderTicketCard(false)}
            </div>
          </div>

          {/* ---- Mobile Floating Bottom Cart Dock (< xl) ---- */}
          {count > 0 && (
            <div className="fixed bottom-3 left-3 right-3 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200 xl:hidden">
              <div
                onClick={() => setMobileTicketOpen(true)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/15 bg-ink-900/95 p-3 text-white shadow-2xl backdrop-blur-xl transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 pl-1">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-md">
                    <ShoppingBag className="h-5 w-5" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-ink-900 shadow">
                      {count}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display text-base font-bold text-white leading-tight">
                      {inr(gst.total)}
                    </span>
                    <span className="text-[11px] text-white/70">
                      {count} item{count === 1 ? '' : 's'} · {ORDER_TYPE_META.find((t) => t.id === effectiveType)?.label || effectiveType}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMobileTicketOpen(true)
                  }}
                  className="h-10 rounded-xl bg-brand px-4 text-xs font-bold text-brand-foreground shadow-md hover:bg-brand-hover"
                >
                  View Ticket →
                </Button>
              </div>
            </div>
          )}

          {/* ---- Mobile Ticket Sheet (< xl) ---- */}
          <Sheet open={mobileTicketOpen} onOpenChange={setMobileTicketOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-md sm:rounded-2xl"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Current Order Ticket</SheetTitle>
              </SheetHeader>
              {renderTicketCard(true)}
            </SheetContent>
          </Sheet>
        </>
      )}
    </>
  )
}
