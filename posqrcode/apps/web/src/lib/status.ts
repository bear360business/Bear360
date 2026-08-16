// Status → color mapping. SINGLE SOURCE OF TRUTH (doc §9).
// Only token classes here — never hex values, never colors at call sites.

import type {
  EmployeeStatus,
  MenuItemStatus,
  OrderStatus,
  RestaurantStatus,
  TableStatus,
} from './types'

export interface StatusStyle {
  label: string
  /** 6px dot background, e.g. "bg-success" */
  dotClass: string
  /** 600-weight text, e.g. "text-success" */
  textClass: string
  /** Tint pill background, e.g. "bg-success-tint" */
  bgClass: string
}

const success: Omit<StatusStyle, 'label'> = {
  dotClass: 'bg-success',
  textClass: 'text-success',
  bgClass: 'bg-success-tint',
}
const warning: Omit<StatusStyle, 'label'> = {
  dotClass: 'bg-warning',
  textClass: 'text-warning',
  bgClass: 'bg-warning-tint',
}
const info: Omit<StatusStyle, 'label'> = {
  dotClass: 'bg-info',
  textClass: 'text-info',
  bgClass: 'bg-info-tint',
}
const danger: Omit<StatusStyle, 'label'> = {
  dotClass: 'bg-danger',
  textClass: 'text-danger',
  bgClass: 'bg-danger-tint',
}
const neutral: Omit<StatusStyle, 'label'> = {
  dotClass: 'bg-muted-foreground',
  textClass: 'text-muted-foreground',
  bgClass: 'bg-surface-muted',
}

export const orderStatusMap: Record<OrderStatus, StatusStyle> = {
  pending: { label: 'Pending', ...warning },
  preparing: { label: 'Preparing', ...info },
  ready: { label: 'Ready', ...success },
  // Generic label; screens that know the order type use orderStatusLabel().
  served: { label: 'Handed over', ...success },
  completed: { label: 'Completed', ...neutral },
  cancelled: { label: 'Cancelled', ...danger },
}

export const tableStatusMap: Record<TableStatus, StatusStyle> = {
  free: { label: 'Free', ...success },
  occupied: { label: 'Occupied', ...warning },
  reserved: { label: 'Reserved', ...info },
}

export const restaurantStatusMap: Record<RestaurantStatus, StatusStyle> = {
  active: { label: 'Active', ...success },
  trial: { label: 'Trial', ...info },
  suspended: { label: 'Suspended', ...danger },
  expired: { label: 'Expired', ...neutral },
}

export const menuItemStatusMap: Record<MenuItemStatus, StatusStyle> = {
  available: { label: 'Available', ...success },
  'sold-out': { label: 'Sold out', ...neutral },
}

/** Employee presence — `active` reused from restaurantStatusMap ("Active"). */
export const employeeStatusMap: Record<Exclude<EmployeeStatus, 'active'>, StatusStyle> = {
  'clocked-in': { label: 'Clocked in', ...success },
  'on-leave': { label: 'On leave', ...warning },
  inactive: { label: 'Inactive', ...neutral },
}

/** Every status key is globally unique, so one flat lookup powers StatusBadge. */
export type AnyStatus =
  | OrderStatus
  | TableStatus
  | RestaurantStatus
  | MenuItemStatus
  | EmployeeStatus

const allStatuses: Record<AnyStatus, StatusStyle> = {
  ...orderStatusMap,
  ...tableStatusMap,
  ...restaurantStatusMap,
  ...menuItemStatusMap,
  ...employeeStatusMap,
}

export function getStatusStyle(status: AnyStatus): StatusStyle {
  return allStatuses[status]
}

/** Ordered kanban columns for the Orders board. */
export const ORDER_KANBAN_STATUSES: OrderStatus[] = [
  'pending',
  'preparing',
  'ready',
  'served',
  'completed',
]

// ---------- Timers (KDS / kanban elapsed time, doc §9 last row) ----------

export type TimerTone = 'default' | 'warning' | 'danger'

/** <8m default · ≥8m warning · ≥12m danger */
export function getTimerTone(elapsedMinutes: number): TimerTone {
  if (elapsedMinutes >= 12) return 'danger'
  if (elapsedMinutes >= 8) return 'warning'
  return 'default'
}

/** Text class for a timer; `dark` = on the ink-900 KDS surface. */
export function getTimerTextClass(elapsedMinutes: number, dark = false): string {
  const tone = getTimerTone(elapsedMinutes)
  if (tone === 'danger') return 'text-danger'
  if (tone === 'warning') return 'text-warning'
  return dark ? 'text-white' : 'text-foreground'
}
