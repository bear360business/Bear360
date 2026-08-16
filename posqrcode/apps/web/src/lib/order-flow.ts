// One pipeline, three vocabularies. A dine-in order is *served*, a takeaway is
// *picked up*, a delivery goes *out for delivery* and is then *delivered* —
// same underlying statuses, different words at the counter and on the guest's
// phone. Keeping one status machine avoids three divergent flows.

import type { Order, OrderStatus, OrderType } from './types'

/** The happy path, in order. `cancelled` sits outside it. */
export const ORDER_PIPELINE: OrderStatus[] = [
  'pending',
  'preparing',
  'ready',
  'served',
  'completed',
]

type LabelSet = Record<OrderStatus, string>

const labels: Record<OrderType, LabelSet> = {
  'dine-in': {
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready',
    served: 'Served',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
  takeaway: {
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready for pickup',
    served: 'Picked up',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
  delivery: {
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready to dispatch',
    served: 'Out for delivery',
    completed: 'Delivered',
    cancelled: 'Cancelled',
  },
}

export function orderTypeOf(order: Pick<Order, 'orderType'>): OrderType {
  return order.orderType ?? 'dine-in'
}

/** What this status is called for this kind of order. */
export function orderStatusLabel(status: OrderStatus, type: OrderType = 'dine-in'): string {
  return labels[type][status]
}

/** Column header on the mixed-type kanban board. */
export function kanbanColumnLabel(status: OrderStatus): string {
  return status === 'served' ? 'Served / Picked up' : labels['dine-in'][status]
}

/** One-word form for the mobile segmented switcher, where five tabs must fit. */
export function shortStatusLabel(status: OrderStatus): string {
  const short: Record<OrderStatus, string> = {
    pending: 'New',
    preparing: 'Prep',
    ready: 'Ready',
    served: 'Handed',
    completed: 'Done',
    cancelled: 'Void',
  }
  return short[status]
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_PIPELINE.indexOf(status)
  return i === -1 || i === ORDER_PIPELINE.length - 1 ? null : ORDER_PIPELINE[i + 1]
}

export function prevStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_PIPELINE.indexOf(status)
  return i <= 0 ? null : ORDER_PIPELINE[i - 1]
}

/** The verb on the button that advances this order. */
export function advanceLabel(status: OrderStatus, type: OrderType = 'dine-in'): string | null {
  const next = nextStatus(status)
  return next ? `Move to ${orderStatusLabel(next, type)}` : null
}

/** Kitchen work is finished from `ready` onwards. */
export function isKitchenDone(status: OrderStatus): boolean {
  return status === 'ready' || status === 'served' || status === 'completed'
}

/** Steps shown on the customer's tracker, in order, for their order type. */
export function trackerSteps(type: OrderType): { status: OrderStatus; label: string }[] {
  return (['pending', 'preparing', 'served', 'completed'] as OrderStatus[]).map((status) => ({
    status,
    label:
      status === 'pending'
        ? 'Placed'
        : status === 'preparing'
          ? 'Preparing'
          : status === 'served'
            ? type === 'delivery'
              ? 'On the way'
              : type === 'takeaway'
                ? 'Ready'
                : 'Ready'
            : type === 'delivery'
              ? 'Delivered'
              : type === 'takeaway'
                ? 'Picked up'
                : 'Served',
  }))
}

/**
 * Where the guest's tracker should point. `ready` and `served` both land on the
 * third step — from the guest's side "your food is ready" and "it's on its way"
 * are the same beat.
 */
export function trackerIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending':
      return 0
    case 'preparing':
      return 1
    case 'ready':
    case 'served':
      return 2
    case 'completed':
      return 3
    default:
      return 0
  }
}
