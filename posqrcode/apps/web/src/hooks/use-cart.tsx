import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { customerBase, sessionKey } from '@/features/customer/routes'
import { useServiceConfig } from '@/hooks/use-service-config'
import { getVenueOps, VENUE_OPS_EVENT, VENUE_OPS_KEY } from '@/hooks/use-venue-ops'
import { tableFreeOrderTypes } from '@/lib/service-config'
import { calcGst, DEFAULT_GST_RATE_PCT } from '@/lib/tax'
import type { MenuItem, OrderType } from '@/lib/types'

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  qty: number
  image?: string
}

export interface CartContextValue {
  restaurantId: string
  /** Empty string on the table-free counter QR. */
  tableId: string
  /** Route prefix this session lives under (table or counter). */
  base: string
  items: CartItem[]
  /** Order-level note ("less spicy please"). */
  note: string
  setNote: (note: string) => void
  /** Add 1 of a menu item (creates the line at qty 1 if absent). */
  addItem: (item: Pick<MenuItem, 'id' | 'name' | 'price' | 'image'>) => void
  /** Set exact quantity; qty <= 0 removes the line. */
  setQty: (menuItemId: string, qty: number) => void
  removeItem: (menuItemId: string) => void
  clear: () => void
  getQty: (menuItemId: string) => number
  /** Total number of units in the cart (badge count). */
  count: number
  /** Dine-in / takeaway / delivery — admin controls which are offered. */
  orderType: OrderType
  setOrderType: (type: OrderType) => void
  /** Enabled types this session may actually pick (no table ⇒ no dine-in). */
  availableOrderTypes: OrderType[]
  /** Flat fee for delivery orders (0 otherwise); taxed like the food. */
  deliveryFee: number
  /** Parcel / packaging charge from Ordering & checkout (takeaway/delivery). */
  parcelFee: number
  subtotal: number
  /** Total GST % applied (CGST + SGST split equally). */
  gstRatePct: number
  cgstPct: number
  sgstPct: number
  cgst: number
  sgst: number
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

interface StoredCart {
  items: CartItem[]
  note: string
  orderType?: OrderType
}

const storageKey = (restaurantId: string, tableId: string) =>
  `bearqr:cart:${restaurantId}:${sessionKey(tableId)}`

function readStored(key: string): StoredCart {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredCart
      if (Array.isArray(parsed.items)) {
        return {
          items: parsed.items,
          note: typeof parsed.note === 'string' ? parsed.note : '',
          orderType: parsed.orderType,
        }
      }
    }
  } catch {
    // corrupt/unavailable storage → start empty
  }
  return { items: [], note: '' }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function CartProvider({
  restaurantId,
  tableId = '',
  gstRatePct = DEFAULT_GST_RATE_PCT,
  children,
}: {
  restaurantId: string
  /** Omitted / empty on the counter QR — the session then has no table. */
  tableId?: string
  /** Total GST % on the food bill, split into CGST + SGST (default 5%). */
  gstRatePct?: number
  children: ReactNode
}) {
  const key = storageKey(restaurantId, tableId)
  const { config: serviceConfig, enabledOrderTypes } = useServiceConfig()
  // No table ⇒ dine-in is meaningless, so it is never offered.
  const availableOrderTypes = tableId ? enabledOrderTypes : tableFreeOrderTypes(enabledOrderTypes)
  const defaultType: OrderType = tableId ? 'dine-in' : 'takeaway'
  const [items, setItems] = useState<CartItem[]>(() => readStored(key).items)
  const [note, setNote] = useState<string>(() => readStored(key).note)
  const [orderType, setOrderType] = useState<OrderType>(
    () => readStored(key).orderType ?? defaultType,
  )
  /** Bumps when Ordering & checkout settings change so tax/parcel recompute. */
  const [opsEpoch, setOpsEpoch] = useState(0)

  // Re-hydrate if the table context changes (new QR scan).
  useEffect(() => {
    const stored = readStored(key)
    setItems(stored.items)
    setNote(stored.note)
    setOrderType(stored.orderType ?? (tableId ? 'dine-in' : 'takeaway'))
  }, [key, tableId])

  useEffect(() => {
    const bump = () => setOpsEpoch((n) => n + 1)
    const onStorage = (e: StorageEvent) => {
      if (e.key === VENUE_OPS_KEY || e.key === null) bump()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(VENUE_OPS_EVENT, bump)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(VENUE_OPS_EVENT, bump)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ items, note, orderType } satisfies StoredCart))
    } catch {
      // storage unavailable — cart just won't persist
    }
  }, [key, items, note, orderType])

  // If the selected type stops being available (admin toggled it off, or the
  // session has no table and dine-in was stored), fall back to the first one.
  const availableKey = availableOrderTypes.join(',')
  useEffect(() => {
    if (!availableOrderTypes.includes(orderType) && availableOrderTypes.length > 0) {
      setOrderType(availableOrderTypes[0])
    }
  }, [availableKey, orderType]) // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = useCallback(
    (item: Pick<MenuItem, 'id' | 'name' | 'price' | 'image'>) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.menuItemId === item.id)
        if (existing) {
          return prev.map((i) =>
            i.menuItemId === item.id ? { ...i, qty: i.qty + 1 } : i,
          )
        }
        return [
          ...prev,
          { menuItemId: item.id, name: item.name, price: item.price, qty: 1, image: item.image },
        ]
      })
    },
    [],
  )

  const setQty = useCallback((menuItemId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.menuItemId !== menuItemId)
        : prev.map((i) => (i.menuItemId === menuItemId ? { ...i, qty } : i)),
    )
  }, [])

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId))
  }, [])

  const clear = useCallback(() => {
    setItems([])
    setNote('')
    // Next walk-in starts fresh — don't inherit delivery from the last ticket.
    setOrderType(tableId ? 'dine-in' : availableOrderTypes[0] ?? 'takeaway')
  }, [tableId, availableOrderTypes])

  const getQty = useCallback(
    (menuItemId: string) => items.find((i) => i.menuItemId === menuItemId)?.qty ?? 0,
    [items],
  )

  const value = useMemo<CartContextValue>(() => {
    const ops = getVenueOps()
    const subtotal = round2(items.reduce((sum, i) => sum + i.price * i.qty, 0))
    const deliveryFee = orderType === 'delivery' && subtotal > 0 ? serviceConfig.deliveryFee : 0
    const parcelFee =
      (orderType === 'takeaway' || orderType === 'delivery') && subtotal > 0
        ? Math.max(0, ops.parcelCharge)
        : 0
    const effectiveGst = ops.taxEnabled ? gstRatePct : 0
    // GST applies to food + delivery + parcel when tax is enabled in Ordering & checkout.
    const gst = calcGst(subtotal + deliveryFee + parcelFee, effectiveGst)
    return {
      restaurantId,
      tableId,
      base: customerBase(restaurantId, tableId),
      items,
      note,
      setNote,
      addItem,
      setQty,
      removeItem,
      clear,
      getQty,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      orderType,
      setOrderType,
      availableOrderTypes,
      deliveryFee,
      parcelFee,
      subtotal,
      gstRatePct: effectiveGst,
      cgstPct: gst.cgstPct,
      sgstPct: gst.sgstPct,
      cgst: gst.cgst,
      sgst: gst.sgst,
      total: gst.total,
    }
  }, [restaurantId, tableId, items, note, orderType, availableKey, serviceConfig.deliveryFee, gstRatePct, opsEpoch, addItem, setQty, removeItem, clear, getQty]) // eslint-disable-line react-hooks/exhaustive-deps

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a <CartProvider>')
  return ctx
}
