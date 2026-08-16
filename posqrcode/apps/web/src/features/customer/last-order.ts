import type { CartItem } from '@/hooks/use-cart'
import type { OrderType } from '@/lib/types'
import { sessionKey } from './routes'

/** Pointer to the order a customer just placed; the order itself lives in the
 *  shared store, so the tracker reflects what the kitchen actually did. */
export interface PlacedOrder {
  /** Id in the orders store — the tracker reads live status from it. */
  orderId: string
  number: number
  token: string
  orderType: OrderType
  items: CartItem[]
  note: string
  deliveryAddress?: string
  subtotal: number
  deliveryFee: number
  cgst: number
  sgst: number
  total: number
  placedAt: string // ISO
}

const key = (restaurantId: string, tableId: string) =>
  `bearqr:last-order:${restaurantId}:${sessionKey(tableId)}`

/** Persist per session (table, or the counter bucket) so Success survives a refresh. */
export function savePlacedOrder(restaurantId: string, tableId: string, order: PlacedOrder): void {
  try {
    sessionStorage.setItem(key(restaurantId, tableId), JSON.stringify(order))
  } catch {
    // storage unavailable — Success page will show the unknown-order state
  }
}

export function readPlacedOrder(restaurantId: string, tableId: string): PlacedOrder | null {
  try {
    const raw = sessionStorage.getItem(key(restaurantId, tableId))
    return raw ? (JSON.parse(raw) as PlacedOrder) : null
  } catch {
    return null
  }
}
