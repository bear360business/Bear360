import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import {
  apiDeleteOrder,
  apiListOrders,
  apiPlaceOrder,
  apiPublicPlaceOrder,
  apiUpdateOrder,
  apiUpdateOrderStatus,
  subscribeRestaurantOrders,
  toApiStatus,
} from '@/lib/api-orders'
import { getAccessToken } from '@/lib/api-client'
import { orders as orderFixtures } from '@/lib/mock'
import { nextStatus, prevStatus } from '@/lib/order-flow'
import { useMockData } from '@/lib/runtime-config'
import { calcGst } from '@/lib/tax'
import type {
  Order,
  OrderChannel,
  OrderItem,
  OrderOrigin,
  OrderStatus,
  OrderType,
} from '@/lib/types'
import {
  resolveDataVenueId,
  subscribeVenueScope,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

/**
 * THE order store — one source of truth for the QR app, POS, kitchen display
 * and the orders board. Orders are tagged with restaurantId and filtered to
 * the active data venue.
 */

export const ORDERS_STORAGE_KEY = 'bearqr:orders'
export const OFFLINE_ORDERS_QUEUE_KEY = 'bearqr:orders:pending-sync'

export interface PendingSyncOrder {
  localId: string
  restaurantId: string
  input: PlaceOrderInput
  queuedAt: number
  attempts: number
  lastError?: string
}

export function readPendingSyncQueue(): PendingSyncOrder[] {
  try {
    const raw = localStorage.getItem(OFFLINE_ORDERS_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writePendingSyncQueue(queue: PendingSyncOrder[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(OFFLINE_ORDERS_QUEUE_KEY)
    } else {
      localStorage.setItem(OFFLINE_ORDERS_QUEUE_KEY, JSON.stringify(queue))
    }
  } catch {
    /* ignore */
  }
}

/** Demo data goes stale: re-seed rather than show a board of 9-hour-old tickets. */
const RESEED_AFTER_MS = 2 * 60 * 60 * 1000

interface StoredOrders {
  seededAt: number
  orders: Order[]
}

export interface PlaceOrderInput {
  items: OrderItem[]
  orderType: OrderType
  restaurantId?: string
  tableId?: string
  tableName?: string
  customerName?: string
  customerPhone?: string
  paymentMethod?: 'pay-at-counter' | 'online' | 'cash' | 'upi' | 'card' | string
  note?: string
  /** Delivery only. */
  deliveryAddress?: string
  /** Paid at the counter (POS) — QR orders settle later. */
  paid?: boolean
  /** Origin channel for delivery-partner and sales reporting. */
  channel?: OrderChannel
  /** Table QR vs counter QR vs POS — shown on the orders board. */
  origin?: OrderOrigin
  gstRatePct?: number
  /** Extra charge folded into the taxable amount. */
  deliveryFee?: number
  /** Packaging charge from Ordering & checkout. */
  parcelFee?: number
}

interface OrdersContextValue {
  orders: Order[]
  getById: (id: string) => Order | undefined
  /** Creates a `pending` order — it appears on the KDS immediately. */
  placeOrder: (input: PlaceOrderInput) => Promise<Order>
  setStatus: (id: string, status: OrderStatus) => void
  /** Mark counter payment settled (POS charge after KOT). Optional payment method. */
  markPaid: (id: string, paymentMethod?: string) => void
  /** Move one step along the pipeline. */
  advance: (id: string) => void
  /** Step back — the kitchen's undo for a mis-tapped "Mark done". */
  rollback: (id: string) => void
  cancel: (id: string) => void
  updateOrder: (id: string, updates: Partial<Order>) => Promise<Order>
  deleteOrder: (id: string) => Promise<void>
  reseed: () => void
  isOnline: boolean
  pendingSyncCount: number
  syncPending: () => Promise<void>
}

const OrdersContext = createContext<OrdersContextValue | null>(null)

function withVenueIds(list: Order[]): Order[] {
  return list.map((o) =>
    o.restaurantId ? o : { ...o, restaurantId: 'masala-bear' },
  )
}

function seed(): StoredOrders {
  return { seededAt: Date.now(), orders: withVenueIds(orderFixtures) }
}

function readStored(): StoredOrders {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as StoredOrders
    if (!Array.isArray(parsed.orders) || typeof parsed.seededAt !== 'number') return seed()
    if (Date.now() - parsed.seededAt > RESEED_AFTER_MS) return seed()
    return { ...parsed, orders: withVenueIds(parsed.orders) }
  } catch {
    return seed()
  }
}

function writeStored(state: StoredOrders): void {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable — orders live for this session only
  }
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [state, setState] = useState<StoredOrders>(() =>
    mock ? readStored() : { seededAt: Date.now(), orders: [] },
  )
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [pendingSyncCount, setPendingSyncCount] = useState(() => readPendingSyncQueue().length)

  const syncPending = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const queue = readPendingSyncQueue()
    if (queue.length === 0) {
      setPendingSyncCount(0)
      return
    }
    const token = getAccessToken()
    const remaining: PendingSyncOrder[] = []
    let synced = 0

    for (const item of queue) {
      try {
        const channel = item.input.channel ?? (item.input.origin === 'pos' ? 'pos' : 'qr')
        const isGuestQr =
          channel === 'qr' ||
          item.input.origin === 'table-qr' ||
          item.input.origin === 'counter-qr' ||
          !token
        const create = isGuestQr ? apiPublicPlaceOrder : apiPlaceOrder

        const created = await create({
          restaurantId: item.restaurantId,
          tableId: item.input.tableId,
          tableName: item.input.tableName,
          type: item.input.orderType,
          channel,
          items: item.input.items,
          guestName: item.input.customerName,
          guestPhone: item.input.customerPhone,
          notes: item.input.note,
          paymentMethod: item.input.paymentMethod,
          paid: item.input.paid,
          deliveryFee: item.input.deliveryFee,
          parcelFee: item.input.parcelFee,
        })

        const localCurrent = state.orders.find((o) => o.id === item.localId)
        const withExtras: Order = {
          ...created,
          paymentMethod:
            localCurrent?.paymentMethod ?? item.input.paymentMethod ?? created.paymentMethod,
          paid: localCurrent?.paid ?? item.input.paid ?? created.paid,
          deliveryAddress:
            localCurrent?.deliveryAddress ?? item.input.deliveryAddress ?? created.deliveryAddress,
          tableName: localCurrent?.tableName ?? item.input.tableName ?? created.tableName,
          origin: localCurrent?.origin ?? item.input.origin ?? created.origin,
        }

        if (localCurrent && (localCurrent.paid || localCurrent.status === 'completed')) {
          try {
            await apiUpdateOrderStatus(item.restaurantId, created.id, 'completed')
            if (localCurrent.paymentMethod) {
              await apiUpdateOrder(item.restaurantId, created.id, {
                paymentMethod: localCurrent.paymentMethod,
                paid: true,
              })
            }
          } catch {
            /* best effort */
          }
        } else if (localCurrent && localCurrent.status !== 'pending') {
          try {
            await apiUpdateOrderStatus(item.restaurantId, created.id, localCurrent.status)
          } catch {
            /* best effort */
          }
        }

        setState((prev) => ({
          ...prev,
          orders: [
            withExtras,
            ...prev.orders.filter((o) => o.id !== item.localId && o.id !== created.id),
          ],
        }))

        synced++
      } catch (err) {
        item.attempts += 1
        item.lastError = err instanceof Error ? err.message : String(err)
        remaining.push(item)
      }
    }

    writePendingSyncQueue(remaining)
    setPendingSyncCount(remaining.length)
    if (synced > 0) {
      toast.success(`Synced ${synced} offline order${synced === 1 ? '' : 's'} to cloud`, {
        description: 'Your counter tickets are now securely recorded on the server.',
      })
    }
  }, [state.orders])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void syncPending()
    }
    const handleOffline = () => {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncPending])

  useEffect(() => {
    if (mock || !isOnline) return
    const interval = setInterval(() => {
      if (readPendingSyncQueue().length > 0) {
        void syncPending()
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [mock, isOnline, syncPending])

  useEffect(() => {
    if (mock) writeStored(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mock) return
    const onStorage = (e: StorageEvent) => {
      if (e.key === ORDERS_STORAGE_KEY || e.key === null) setState(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [mock])

  useEffect(
    () =>
      subscribeVenueScope(() => {
        setVenueId(resolveDataVenueId())
      }),
    [],
  )

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void apiListOrders(venueId)
      .then((serverOrders) => {
        if (!cancelled) {
          setState((prev) => {
            const queue = readPendingSyncQueue()
            const pendingIds = new Set(queue.map((q) => q.localId))
            const localPending = prev.orders.filter((o) => pendingIds.has(o.id))
            const serverFiltered = serverOrders.filter((so) => !pendingIds.has(so.id))
            return { seededAt: Date.now(), orders: [...localPending, ...serverFiltered] }
          })
        }
      })
      .catch((err) => {
        if (getAccessToken()) reportApiError(err, 'Could not load orders')
      })
    const unsub = subscribeRestaurantOrders(venueId, (order) => {
      setState((prev) => {
        const idx = prev.orders.findIndex((o) => o.id === order.id)
        const orders =
          idx >= 0
            ? prev.orders.map((o) => (o.id === order.id ? order : o))
            : [order, ...prev.orders]
        return { ...prev, orders }
      })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [mock, venueId, authTick])

  const commit = useCallback((update: (prev: Order[]) => Order[]) => {
    setState((prev) => {
      const next = { ...prev, orders: update(prev.orders) }
      if (mock) writeStored(next)
      return next
    })
  }, [mock])

  const placeOrder = useCallback(
    async (input: PlaceOrderInput): Promise<Order> => {
      const restaurantId = input.restaurantId || resolveDataVenueId()

      if (!mock) {
        const channel = input.channel ?? (input.origin === 'pos' ? 'pos' : 'qr')
        const isGuestQr =
          channel === 'qr' ||
          input.origin === 'table-qr' ||
          input.origin === 'counter-qr' ||
          !getAccessToken()
        const create = isGuestQr ? apiPublicPlaceOrder : apiPlaceOrder

        // If explicitly offline, don't wait for network timeout
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const optimistic = buildLocalOrder(input, state.orders, restaurantId)
          const queue = readPendingSyncQueue()
          queue.push({
            localId: optimistic.id,
            restaurantId,
            input,
            queuedAt: Date.now(),
            attempts: 0,
          })
          writePendingSyncQueue(queue)
          setPendingSyncCount(queue.length)
          commit((prev) => [optimistic, ...prev])
          toast.info(`Offline: Order #${optimistic.number} saved locally`, {
            description: 'Will automatically sync to server when connection returns.',
          })
          return optimistic
        }

        try {
          const created = await create({
            restaurantId,
            tableId: input.tableId,
            tableName: input.tableName,
            type: input.orderType,
            channel,
            items: input.items,
            guestName: input.customerName,
            guestPhone: input.customerPhone,
            notes: input.note,
            paymentMethod: input.paymentMethod,
            paid: input.paid,
            deliveryFee: input.deliveryFee,
            parcelFee: input.parcelFee,
          })
          const withExtras: Order = {
            ...created,
            paymentMethod: input.paymentMethod ?? created.paymentMethod,
            paid: input.paid ?? created.paid,
            deliveryAddress: input.deliveryAddress ?? created.deliveryAddress,
            tableName: input.tableName ?? created.tableName,
            origin: input.origin ?? created.origin,
          }
          commit((prev) => [withExtras, ...prev.filter((o) => o.id !== withExtras.id)])
          return withExtras
        } catch (err) {
          reportApiError(err, 'Could not place order on server — saved locally')
          const optimistic = buildLocalOrder(input, state.orders, restaurantId)
          const queue = readPendingSyncQueue()
          queue.push({
            localId: optimistic.id,
            restaurantId,
            input,
            queuedAt: Date.now(),
            attempts: 0,
          })
          writePendingSyncQueue(queue)
          setPendingSyncCount(queue.length)
          commit((prev) => [optimistic, ...prev])
          return optimistic
        }
      }

      const order = buildLocalOrder(input, state.orders, restaurantId)
      commit((prev) => [order, ...prev])
      return order
    },
    [commit, mock, state.orders],
  )

  const setStatus = useCallback(
    (id: string, status: OrderStatus) => {
      if (!mock) {
        const current = state.orders.find((o) => o.id === id)
        if (current) {
          void apiUpdateOrderStatus(current.restaurantId, id, status).catch((err) => reportApiError(err))
        }
      }
      commit((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status,
                ...(status === 'ready' && !o.servedAt
                  ? { servedAt: new Date().toISOString() }
                  : {}),
                ...(status === 'pending' || status === 'preparing'
                  ? { servedAt: undefined }
                  : {}),
              }
            : o,
        ),
      )
    },
    [commit, mock, state.orders],
  )

  const markPaid = useCallback(
    (id: string, paymentMethod?: string) => {
      const current = state.orders.find((o) => o.id === id)
      if (current && !mock) {
        void apiUpdateOrderStatus(current.restaurantId, id, 'completed').catch((err) =>
          reportApiError(err),
        )
        if (paymentMethod) {
          void apiUpdateOrder(current.restaurantId, id, { paymentMethod, paid: true }).catch(
            (err) => reportApiError(err),
          )
        }
      }
      commit((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                paid: true,
                status: 'completed' as OrderStatus,
                ...(paymentMethod ? { paymentMethod } : {}),
              }
            : o,
        ),
      )
    },
    [commit, mock, state.orders],
  )

  const advance = useCallback(
    (id: string) => {
      const current = state.orders.find((o) => o.id === id)
      const next = current ? nextStatus(current.status) : null
      if (current && next && !mock) {
        void apiUpdateOrderStatus(current.restaurantId, id, next).catch((err) => reportApiError(err))
      }
      commit((prev) =>
        prev.map((o) => {
          const n = nextStatus(o.status)
          if (o.id !== id || !n) return o
          return {
            ...o,
            status: n,
            ...(n === 'ready' && !o.servedAt ? { servedAt: new Date().toISOString() } : {}),
          }
        }),
      )
    },
    [commit, mock, state.orders],
  )

  const rollback = useCallback(
    (id: string) => {
      const current = state.orders.find((o) => o.id === id)
      const back = current ? prevStatus(current.status) : null
      if (current && back && !mock) {
        void apiUpdateOrderStatus(current.restaurantId, id, back).catch((err) => reportApiError(err))
      }
      commit((prev) =>
        prev.map((o) => {
          const prevStep = prevStatus(o.status)
          if (o.id !== id || !prevStep) return o
          return {
            ...o,
            status: prevStep,
            ...(prevStep === 'preparing' || prevStep === 'pending'
              ? { servedAt: undefined }
              : {}),
          }
        }),
      )
    },
    [commit, mock, state.orders],
  )

  const cancel = useCallback(
    (id: string) => {
      const current = state.orders.find((o) => o.id === id)
      if (current && !mock) {
        void apiUpdateOrderStatus(current.restaurantId, id, 'cancelled').catch((err) => reportApiError(err))
      }
      commit((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)))
    },
    [commit, mock, state.orders],
  )

  const updateOrder = useCallback(
    async (id: string, updates: Partial<Order>): Promise<Order> => {
      const current = state.orders.find((o) => o.id === id)
      if (!current) throw new Error('Order not found')

      // Recalculate totals if items changed
      const subtotal = updates.items
        ? updates.items.reduce((s, i) => s + i.price * i.qty, 0)
        : current.subtotal
      const prevTaxRate =
        current.subtotal > 0 && current.cgst + current.sgst > 0
          ? ((current.cgst + current.sgst) / current.subtotal) * 100
          : 5
      const gst = updates.items
        ? calcGst(subtotal, prevTaxRate)
        : { cgst: current.cgst, sgst: current.sgst, total: current.total }
      const cgst = gst.cgst
      const sgst = gst.sgst
      const total = gst.total

      const updatedOrder: Order = {
        ...current,
        ...updates,
        subtotal,
        cgst,
        sgst,
        total,
      }

      if (!mock && getAccessToken()) {
        try {
          await apiUpdateOrder(current.restaurantId, id, {
            items: updates.items,
            type: updates.orderType,
            tableId: updates.tableId,
            tableName: updates.tableName,
            guestName: updates.customerName,
            guestPhone: updates.customerPhone,
            notes: updates.note,
            paymentMethod: updates.paymentMethod,
            paid: updates.paid,
            status: updates.status ? toApiStatus(updates.status) : undefined,
          })
        } catch (err) {
          reportApiError(err, 'Could not sync update to server — updated locally')
        }
      }

      commit((prev) => prev.map((o) => (o.id === id ? updatedOrder : o)))
      return updatedOrder
    },
    [commit, mock, state.orders],
  )

  const deleteOrder = useCallback(
    async (id: string): Promise<void> => {
      const current = state.orders.find((o) => o.id === id)
      // Clean up from offline queue if this order was pending sync
      const queue = readPendingSyncQueue().filter((q) => q.localId !== id)
      writePendingSyncQueue(queue)
      setPendingSyncCount(queue.length)

      if (current && !mock && getAccessToken()) {
        try {
          await apiDeleteOrder(current.restaurantId, id)
        } catch (err) {
          reportApiError(err, 'Could not delete from server — removed locally')
        }
      }
      commit((prev) => prev.filter((o) => o.id !== id))
    },
    [commit, mock, state.orders],
  )

  const reseed = useCallback(() => {
    const fresh = seed()
    writeStored(fresh)
    setState(fresh)
  }, [])

  const venueOrders = useMemo(
    () => state.orders.filter((o) => (o.restaurantId || 'masala-bear') === venueId),
    [state.orders, venueId],
  )

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders: venueOrders,
      getById: (id: string) => state.orders.find((o) => o.id === id),
      placeOrder,
      setStatus,
      markPaid,
      advance,
      rollback,
      cancel,
      updateOrder,
      deleteOrder,
      reseed,
      isOnline,
      pendingSyncCount,
      syncPending,
    }),
    [
      venueOrders,
      state.orders,
      placeOrder,
      setStatus,
      markPaid,
      advance,
      rollback,
      cancel,
      updateOrder,
      deleteOrder,
      reseed,
      isOnline,
      pendingSyncCount,
      syncPending,
    ],
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used within an <OrdersProvider>')
  return ctx
}

function buildLocalOrder(
  input: PlaceOrderInput,
  existing: Order[],
  restaurantId: string,
): Order {
  const subtotal = input.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const fee = (input.deliveryFee ?? 0) + (input.parcelFee ?? 0)
  const gst = calcGst(subtotal + fee, input.gstRatePct)
  const number =
    Math.max(
      0,
      ...existing.map((o) => o.number),
      Number(localStorage.getItem('bearqr:pos-seq')) || 0,
    ) + 1
  return {
    id: `order-${number}-${Date.now().toString(36)}`,
    restaurantId,
    number,
    token: `A-${String(number % 100).padStart(2, '0')}`,
    tableId: input.tableId ?? '',
    tableName:
      input.tableName ??
      (input.orderType === 'delivery'
        ? 'Delivery'
        : input.orderType === 'takeaway'
          ? 'Takeaway'
          : 'Counter'),
    ...(input.customerName ? { customerName: input.customerName } : {}),
    ...(input.customerPhone ? { customerPhone: input.customerPhone } : {}),
    ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
    status: 'pending',
    orderType: input.orderType,
    ...(input.channel ? { channel: input.channel } : {}),
    ...(input.origin ? { origin: input.origin } : {}),
    items: input.items,
    ...(input.note ? { note: input.note } : {}),
    ...(input.deliveryAddress ? { deliveryAddress: input.deliveryAddress } : {}),
    subtotal: gst.subtotal,
    cgst: gst.cgst,
    sgst: gst.sgst,
    total: gst.total,
    ...(input.paid ? { paid: true } : {}),
    placedAt: new Date().toISOString(),
  }
}
