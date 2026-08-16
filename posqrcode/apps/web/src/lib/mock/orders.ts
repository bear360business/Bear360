import { prepTargetSecFor } from '../kitchen'
import type { Order, OrderItem, OrderStatus } from '../types'
import { calcGst } from '../tax'
import { getCurrentRestaurant } from './restaurants'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

/** Named guests for a few tickets; the rest are anonymous counter walk-ins. */
const guests = [
  'Aarav Sharma',
  'Priya Menon',
  'Rohan Iyer',
  'Neha Kapoor',
  'Vikram Rao',
  'Ananya Desai',
  'Karan Malhotra',
]

let seq = 0
function make(
  number: number,
  status: OrderStatus,
  tableNumber: number,
  placedMinutesAgo: number,
  items: OrderItem[],
  extra?: Partial<Pick<Order, 'note' | 'paid' | 'orderType'>>,
): Order {
  seq += 1
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const gst = calcGst(subtotal, getCurrentRestaurant().gstRatePct)
  // Sequential slot so no two adjacent tickets show the same guest; slots past
  // the name list are anonymous counter walk-ins.
  const slot = seq % 10
  // Served tickets get a real finish time so the KDS can show early/late
  // against the target instead of guessing. The swing is a share of the target
  // (±24%) rather than a flat offset, so a small order can't come out at 1:30.
  const target = prepTargetSecFor(items)
  const servedAfterSec =
    status === 'ready' || status === 'completed'
      ? Math.min(Math.round(target * (1 + ((number % 5) - 3) * 0.08)), placedMinutesAgo * 60)
      : null

  return {
    id: `order-${number}`,
    restaurantId: 'masala-bear',
    number,
    token: `A-${String(seq).padStart(2, '0')}`,
    tableId: `t-${String(tableNumber).padStart(2, '0')}`,
    tableName: `Table ${tableNumber}`,
    ...(slot < guests.length ? { customerName: guests[slot] } : {}),
    status,
    items,
    subtotal: gst.subtotal,
    cgst: gst.cgst,
    sgst: gst.sgst,
    total: gst.total,
    placedAt: minutesAgo(placedMinutesAgo),
    ...(servedAfterSec !== null
      ? { servedAt: new Date(Date.now() - (placedMinutesAgo * 60 - servedAfterSec) * 1000).toISOString() }
      : {}),
    ...extra,
  }
}

const line = (menuItemId: string, name: string, qty: number, price: number, note?: string): OrderItem =>
  note ? { menuItemId, name, qty, price, note } : { menuItemId, name, qty, price }

export const orders: Order[] = [
  // ---- Pending (6) ----
  make(132, 'pending', 4, 2, [
    line('butter-chicken', 'Butter Chicken', 2, 349, 'Less spicy'),
    line('butter-naan', 'Butter Naan', 3, 59),
  ]),
  make(133, 'pending', 6, 3, [
    line('paneer-butter-masala', 'Paneer Butter Masala', 1, 299, 'Extra gravy'),
    line('masala-chai', 'Masala Chai', 2, 49),
  ]),
  make(134, 'pending', 1, 5, [
    line('masala-dosa', 'Masala Dosa', 1, 149),
    line('filter-coffee', 'Filter Coffee', 1, 59),
  ], { orderType: 'takeaway' }),
  make(135, 'pending', 10, 9, [
    line('chicken-biryani', 'Hyderabadi Chicken Biryani', 2, 329),
  ], { note: 'Birthday table — bring dessert last' }),
  make(136, 'pending', 8, 12, [
    line('rogan-josh', 'Mutton Rogan Josh', 1, 379),
    line('tandoori-roti', 'Tandoori Roti', 2, 35),
    line('nimbu-soda', 'Masala Nimbu Soda', 2, 69),
  ]),
  make(137, 'pending', 3, 1, [
    line('veg-biryani', 'Veg Dum Biryani', 1, 249),
  ]),
  // Overdue on purpose — the KDS "Delayed" stage needs a live example.
  make(139, 'pending', 12, 19, [
    line('dal-makhani', 'Dal Makhani', 1, 279),
    line('butter-naan', 'Butter Naan', 2, 59),
  ], { note: 'Guest asked twice — expedite' }),
  // ---- Preparing (4) ----
  make(130, 'preparing', 2, 8, [
    line('amritsari-chole', 'Amritsari Chole', 1, 199),
    line('laccha-paratha', 'Laccha Paratha', 2, 69),
    line('sweet-lassi', 'Sweet Lassi', 1, 89),
  ]),
  make(131, 'preparing', 3, 6, [
    line('kadhai-chicken', 'Kadhai Chicken', 1, 329),
    line('garlic-naan', 'Garlic Naan', 2, 79),
  ]),
  make(129, 'preparing', 11, 10, [
    line('mutton-biryani', 'Mutton Biryani', 2, 399, 'One extra raita'),
  ], { orderType: 'delivery' }),
  make(126, 'preparing', 7, 14, [
    line('samosa', 'Punjabi Samosa (2 pc)', 3, 79),
    line('pav-bhaji', 'Pav Bhaji', 1, 149),
  ]),
  make(138, 'preparing', 5, 26, [
    line('rogan-josh', 'Mutton Rogan Josh', 1, 379),
    line('tandoori-roti', 'Tandoori Roti', 1, 35),
  ], { orderType: 'delivery' }),
  // ---- Ready (3) ----
  make(128, 'ready', 1, 12, [
    line('masala-dosa', 'Masala Dosa', 2, 149),
    line('medu-vada', 'Medu Vada (2 pc)', 1, 109),
  ]),
  make(125, 'ready', 5, 18, [
    line('pav-bhaji', 'Pav Bhaji', 2, 149),
    line('mango-lassi', 'Mango Lassi', 1, 109),
  ], { orderType: 'takeaway' }),
  make(124, 'ready', 9, 21, [
    line('gulab-jamun', 'Gulab Jamun (2 pc)', 1, 99),
    line('rasmalai', 'Rasmalai (2 pc)', 2, 129),
  ]),
  // ---- Completed (8 sample rows of today's 38) ----
  make(127, 'completed', 6, 26, [
    line('butter-chicken', 'Butter Chicken', 1, 349),
    line('jeera-rice', 'Jeera Rice', 1, 149),
  ], { paid: true }),
  make(123, 'completed', 2, 42, [
    line('chicken-tikka', 'Chicken Tikka', 2, 299),
  ], { paid: true }),
  make(122, 'completed', 12, 55, [
    line('hara-bhara-kabab', 'Hara Bhara Kabab', 2, 199),
    line('veg-biryani', 'Veg Dum Biryani', 1, 249),
  ], { paid: true }),
  make(121, 'completed', 4, 68, [
    line('vada-pav', 'Vada Pav', 2, 59),
    line('masala-chai', 'Masala Chai', 2, 49),
  ], { paid: true }),
  make(120, 'completed', 8, 83, [
    line('mutton-biryani', 'Mutton Biryani', 1, 399),
  ], { paid: true, orderType: 'delivery' }),
  make(119, 'completed', 5, 95, [
    line('kadhai-chicken', 'Kadhai Chicken', 1, 329),
    line('nimbu-soda', 'Masala Nimbu Soda', 1, 69),
  ], { paid: true }),
  make(118, 'completed', 7, 110, [
    line('gajar-halwa', 'Gajar ka Halwa', 2, 149),
  ], { paid: true }),
  make(117, 'completed', 10, 124, [
    line('masala-dosa', 'Masala Dosa', 2, 149),
    line('veg-pakora', 'Mixed Veg Pakora', 1, 149),
  ], { paid: true }),
  // ---- Cancelled (1) ----
  make(116, 'cancelled', 9, 140, [
    line('dahi-puri', 'Dahi Puri (6 pc)', 1, 119),
  ], { note: 'Guest left before preparing' }),
]

/** Total completed today (board shows a sample of rows). */
export const completedTodayCount = 38

export function getOrderById(id: string): Order | undefined {
  return orders.find((o) => o.id === id)
}

export function getOrdersByStatus(status: OrderStatus): Order[] {
  return orders.filter((o) => o.status === status)
}

/** Pending count for the sidebar Orders badge. */
export const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length

/** Minutes elapsed since an order was placed (for timers). */
export function getElapsedMinutes(order: Order): number {
  return Math.max(0, Math.floor((Date.now() - new Date(order.placedAt).getTime()) / 60_000))
}
