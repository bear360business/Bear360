import type { OrderDto, OrderStatus as ApiOrderStatus } from '@bear360/shared'
import { REALTIME_EVENTS } from '@bear360/shared'
import { io, type Socket } from 'socket.io-client'
import { apiRequest, getAccessToken } from '@/lib/api-client'
import { wsBaseUrl } from '@/lib/runtime-config'
import type { Order, OrderItem, OrderStatus } from '@/lib/types'

export async function apiListOrders(restaurantId: string): Promise<Order[]> {
  const rows = await apiRequest<OrderDto[]>(`/restaurants/${restaurantId}/orders`)
  return rows.map(dtoToOrder)
}

type PlaceOrderBody = {
  restaurantId: string
  tableId?: string
  tableName?: string
  type: 'dine-in' | 'takeaway' | 'delivery'
  channel?: string
  items: OrderItem[]
  guestName?: string
  guestPhone?: string
  notes?: string
  paymentMethod?: string
  paid?: boolean
  deliveryFee?: number
  parcelFee?: number
}

function orderBody(input: PlaceOrderBody) {
  return {
    restaurantId: input.restaurantId,
    tableId: input.tableId,
    tableName: input.tableName,
    type: input.type,
    channel: input.channel ?? 'qr',
    lines: input.items.map((i) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      qty: i.qty,
      unitPrice: i.price,
      notes: i.note,
    })),
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    notes: input.notes,
    paymentMethod: input.paymentMethod,
    paid: input.paid,
    deliveryFee: input.deliveryFee,
    parcelFee: input.parcelFee,
  }
}

/** Authenticated POS / staff place order. */
export async function apiPlaceOrder(input: PlaceOrderBody): Promise<Order> {
  const dto = await apiRequest<OrderDto>(`/restaurants/${input.restaurantId}/orders`, {
    body: orderBody(input),
  })
  return dtoToOrder(dto)
}

/** Update order items, table, notes, payment, or status. */
export async function apiUpdateOrder(
  restaurantId: string,
  orderId: string,
  input: {
    items?: OrderItem[]
    type?: 'dine-in' | 'takeaway' | 'delivery'
    tableId?: string | null
    tableName?: string | null
    guestName?: string | null
    guestPhone?: string | null
    notes?: string | null
    paymentMethod?: string | null
    paid?: boolean
    status?: ApiOrderStatus
  },
): Promise<Order> {
  const body: Record<string, unknown> = {}
  if (input.items) {
    body.lines = input.items.map((i) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      qty: i.qty,
      unitPrice: i.price,
      notes: i.note,
    }))
  }
  if (input.type) body.type = input.type
  if (input.tableId !== undefined) body.tableId = input.tableId
  if (input.tableName !== undefined) body.tableName = input.tableName
  if (input.guestName !== undefined) body.guestName = input.guestName
  if (input.guestPhone !== undefined) body.guestPhone = input.guestPhone
  if (input.notes !== undefined) body.notes = input.notes
  if (input.paymentMethod !== undefined) body.paymentMethod = input.paymentMethod
  if (input.paid !== undefined) body.paid = input.paid
  if (input.status) body.status = input.status

  const dto = await apiRequest<OrderDto>(`/restaurants/${restaurantId}/orders/${orderId}`, {
    method: 'PATCH',
    body,
  })
  return dtoToOrder(dto)
}

/** Delete / Void an order. */
export async function apiDeleteOrder(restaurantId: string, orderId: string): Promise<void> {
  await apiRequest(`/restaurants/${restaurantId}/orders/${orderId}`, {
    method: 'DELETE',
  })
}

/** Guest QR — no JWT. */
export async function apiPublicPlaceOrder(input: PlaceOrderBody): Promise<Order> {
  const dto = await apiRequest<OrderDto>(`/public/r/${input.restaurantId}/orders`, {
    auth: false,
    body: orderBody(input),
  })
  return dtoToOrder(dto)
}

export async function apiPublicTrackOrder(
  restaurantId: string,
  orderId: string,
): Promise<{ id: string; number: string; status: string; total: number }> {
  return apiRequest(`/public/r/${restaurantId}/orders/${orderId}`, { auth: false })
}

export async function apiPublicMenu(restaurantId: string): Promise<{
  categories: Array<{ id: string; name: string; emoji?: string; sortOrder?: number }>
  items: Array<{
    id: string
    categoryId: string
    name: string
    description: string
    price: number
    veg: boolean
    spicy: boolean
    available: boolean
    popular?: boolean
    image: string
  }>
}> {
  return apiRequest(`/public/r/${restaurantId}/menu`, { auth: false })
}

export type PublicVenue = {
  id: string
  slug: string
  name: string
  phone: string
  address: string | null
  city: string
  cuisine?: string
  whatsapp?: string | null
  mapsLink?: string | null
  emoji: string
  logoImage?: string | null
  coverImage?: string | null
  isOpen: boolean
  opensAt?: string | null
  closesAt?: string | null
  currency: string
  gstRatePct: number
  industryId?: string
  settings?: Record<string, unknown>
}

export type PublicTable = {
  id: string
  name: string
  number: number
  seats: number
  status: string
  zone: string
}

export async function apiPublicVenue(restaurantId: string): Promise<PublicVenue> {
  const row = await apiRequest<PublicVenue & { code?: string }>(
    `/public/r/${restaurantId}`,
    { auth: false },
  )
  if (row.code === 'NOT_FOUND') throw new Error('Restaurant not found')
  return row
}

export async function apiPublicTable(
  restaurantId: string,
  tableId: string,
): Promise<PublicTable> {
  const row = await apiRequest<PublicTable & { code?: string }>(
    `/public/r/${restaurantId}/tables/${tableId}`,
    { auth: false },
  )
  if (row.code === 'NOT_FOUND') throw new Error('Table not found')
  return row
}

export async function apiUpdateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  const dto = await apiRequest<OrderDto>(
    `/restaurants/${restaurantId}/orders/${orderId}/status`,
    { body: { status: toApiStatus(status) } },
  )
  return dtoToOrder(dto)
}

export function subscribeRestaurantOrders(
  restaurantId: string,
  onOrder: (order: Order) => void,
): () => void {
  const token = getAccessToken()
  if (!token) return () => undefined

  const socket: Socket = io(wsBaseUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    socket.emit('orders.subscribe', { restaurantId })
  })

  const handler = (dto: OrderDto) => onOrder(dtoToOrder(dto))
  socket.on(REALTIME_EVENTS.ORDER_CREATED, handler)
  socket.on(REALTIME_EVENTS.ORDER_UPDATED, handler)
  socket.on(REALTIME_EVENTS.ORDER_STATUS, handler)

  return () => {
    socket.disconnect()
  }
}

/** Guest success tracker — no JWT; room is scoped to one order. */
export function subscribeGuestOrder(
  restaurantId: string,
  orderId: string,
  onOrder: (order: Order) => void,
): () => void {
  if (!restaurantId || !orderId) return () => undefined

  const socket: Socket = io(wsBaseUrl(), {
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    socket.emit('orders.subscribeGuest', { restaurantId, orderId })
  })

  const handler = (dto: OrderDto) => {
    if (dto.id !== orderId) return
    onOrder(dtoToOrder(dto))
  }
  socket.on(REALTIME_EVENTS.ORDER_CREATED, handler)
  socket.on(REALTIME_EVENTS.ORDER_UPDATED, handler)
  socket.on(REALTIME_EVENTS.ORDER_STATUS, handler)

  return () => {
    socket.disconnect()
  }
}

function lookupTableName(tableId: string | null | undefined, type: string): string {
  if (!tableId) return type === 'dine-in' ? 'Dine-in' : type === 'delivery' ? 'Delivery' : 'Takeaway'
  try {
    // Scan all table storage keys (both unscoped and venueKey scoped)
    for (let idx = 0; idx < localStorage.length; idx++) {
      const key = localStorage.key(idx)
      if (key && (key === 'bearqr:tables' || key.startsWith('bearqr:tables:'))) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          const list = Array.isArray(parsed) ? parsed : Object.values(parsed).flat()
          const match = (list as Array<{ id: string; name: string }>).find((t) => t && t.id === tableId)
          if (match?.name) return match.name
        }
      }
    }
  } catch {
    /* ignore */
  }
  return `Table ${tableId.length > 8 ? tableId.slice(0, 4) : tableId}`
}

function dtoToOrder(dto: OrderDto): Order {
  const num = Number(dto.number.replace(/\D/g, '')) || 0
  const taxHalf = dto.tax / 2
  const channel =
    dto.channel === 'pos' ||
    dto.channel === 'swiggy' ||
    dto.channel === 'zomato' ||
    dto.channel === 'qr'
      ? dto.channel
      : 'qr'
  const tableName = dto.tableName?.trim() || lookupTableName(dto.tableId, dto.type)
  return {
    id: dto.id,
    restaurantId: dto.restaurantId,
    number: num,
    token: dto.number,
    tableId: dto.tableId ?? '',
    tableName,
    customerName: dto.guestName ?? undefined,
    customerPhone: dto.guestPhone ?? undefined,
    paymentMethod: dto.paymentMethod ?? undefined,
    status: mapStatus(dto.status),
    orderType: dto.type,
    channel,
    origin: channel === 'pos' ? 'pos' : channel === 'qr' ? 'table-qr' : 'partner',
    items: dto.lines.map((l) => ({
      menuItemId: l.menuItemId,
      name: l.name,
      qty: l.qty,
      price: l.unitPrice,
      note: l.notes,
    })),
    note: dto.notes ?? undefined,
    subtotal: dto.subtotal,
    cgst: taxHalf,
    sgst: taxHalf,
    total: dto.total,
    paid: Boolean(dto.paid) || dto.status === 'paid',
    placedAt: dto.createdAt,
  }
}

function mapStatus(status: ApiOrderStatus): OrderStatus {
  if (status === 'void') return 'cancelled'
  if (status === 'paid') return 'completed'
  return status as OrderStatus
}

export function toApiStatus(status: OrderStatus): ApiOrderStatus {
  if (status === 'completed') return 'paid'
  return status as ApiOrderStatus
}
