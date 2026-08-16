/** Socket.IO room helper — kitchen / POS / QR subscribe here. */
export function restaurantOrdersRoom(restaurantId: string): string {
  return `restaurant:${restaurantId}:orders`
}

/** Guest tracker room — only events for one order id. */
export function restaurantOrderRoom(restaurantId: string, orderId: string): string {
  return `restaurant:${restaurantId}:order:${orderId}`
}

export const REALTIME_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_STATUS: 'order.status',
} as const

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS]
