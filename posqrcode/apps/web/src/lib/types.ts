// Bear 360 domain types — the single typing layer for all mock fixtures.

// ---------- Statuses ----------
export type RestaurantStatus = 'active' | 'trial' | 'suspended' | 'expired'
export type TableStatus = 'free' | 'occupied' | 'reserved'
/**
 * `served` is the hand-over step between the kitchen finishing and the order
 * closing. Its label depends on the order type — served / picked up / out for
 * delivery — see `orderStatusLabel()` in lib/order-flow.ts.
 */
export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled'
export type MenuItemStatus = 'available' | 'sold-out'

// ---------- Plans ----------
// Canonical ids live in lib/tenant.ts (the entitlement layer) so fixtures and
// gating can never drift apart.
export type { PlanId } from './tenant'
import type { PlanId } from './tenant'
export type { IndustryId } from './industries'
import type { IndustryId } from './industries'

export interface Plan {
  id: PlanId
  name: string
  /** Monthly price in ₹ (INR); null = "Custom" (Enterprise). */
  priceMonthly: number | null
  /** Display price, e.g. "₹999" or "Custom". */
  priceLabel: string
  features: string[]
  restaurantCount: number
  popular?: boolean
  /** Enterprise renders as the dark ink-800 card. */
  dark?: boolean
}

// ---------- Restaurants ----------
export interface Restaurant {
  id: string
  /** URL slug used in /r/:restaurantId */
  slug: string
  name: string
  emoji: string
  ownerName: string
  ownerEmail: string
  phone: string
  city: string
  /** Street address for bills / profile (optional). */
  address?: string
  /** Google Maps / Apple Maps link for guests. */
  mapsLink?: string
  /** WhatsApp number for checkout (digits or +91…). */
  whatsapp?: string
  /** Show owner email on public menu. */
  showEmail?: boolean
  /** Print logo on receipts (demo flag). */
  logoOnReceipt?: boolean
  country?: string
  instagram?: string
  facebook?: string
  youtube?: string
  website?: string
  /** Closing time label, e.g. "23:00". */
  closesAt?: string
  cuisine: string
  /** Venue vertical — Restaurants, Hotels, Cloud Kitchens, etc. */
  industryId: IndustryId
  planId: PlanId
  status: RestaurantStatus
  /** Restored when Super activates a suspended venue. */
  statusBeforeSuspend?: RestaurantStatus
  /** Monthly recurring revenue in ₹ (INR). */
  mrr: number
  rating: number
  isOpen: boolean
  opensAt?: string
  /** Total GST % on food bills (CGST + SGST split equally). 5 = standalone restaurant, 18 = hotel premises. */
  gstRatePct: number
  /** 15-char GST registration number shown on customer bills. */
  gstin?: string
  currency: string
  coverImage: string
  logoImage: string
  createdAt: string // ISO date
}

// ---------- Tables ----------
export type TableZone = 'Main hall' | 'Patio' | 'Private' | 'Bar'

export interface DiningTable {
  id: string // 't-01'
  name: string // 'T-01'
  number: number
  seats: number
  status: TableStatus
  zone: TableZone
  /** Present when occupied — references an Order id. */
  activeOrderId?: string
  /** Present when reserved — references a Reservation id. */
  reservationId?: string
}

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'no-show'
  | 'cancelled'

export interface Reservation {
  id: string
  guestName: string
  phone: string
  partySize: number
  /** ISO date YYYY-MM-DD */
  date: string
  /** HH:mm */
  time: string
  /** Duration in minutes */
  durationMinutes: number
  status: ReservationStatus
  tableId?: string
  note?: string
  /** Special occasion label, e.g. "Birthday" */
  occasion?: string
  createdAt: string
}

// ---------- Menu ----------
export interface MenuCategory {
  id: string
  name: string
  emoji: string
  sortOrder: number
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  veg: boolean
  spicy: boolean
  available: boolean
  image: string
  popular?: boolean
}

// ---------- Orders ----------
/** How the customer receives the order. Admin controls which are offered. */
export type OrderType = 'dine-in' | 'takeaway' | 'delivery'
/** Where the order originated; delivery partners enter through Integrations. */
export type OrderChannel = 'qr' | 'pos' | 'swiggy' | 'zomato'
/** Guest / staff entry path — distinguishes table QR vs counter QR vs POS. */
export type OrderOrigin = 'table-qr' | 'counter-qr' | 'pos' | 'partner'

export interface OrderItem {
  menuItemId: string
  name: string
  qty: number
  /** Unit price at order time. */
  price: number
  note?: string
}

export interface Order {
  id: string
  /** Venue that owns this ticket — filters kitchen / orders / POS boards. */
  restaurantId: string
  number: number // display "#132"
  token: string // "A-12"
  tableId: string
  tableName: string // "Table 4"
  /** Guest the ticket belongs to; absent for anonymous counter orders. */
  customerName?: string
  /** Guest phone from checkout (Ordering & checkout form). */
  customerPhone?: string
  /** How the guest chose to pay at QR checkout. */
  paymentMethod?: 'pay-at-counter' | 'online'
  status: OrderStatus
  /** Defaults to dine-in when absent (table QR orders). */
  orderType?: OrderType
  /** Sales channel used by reporting and partner reconciliation. */
  channel?: OrderChannel
  /** How the ticket entered the kitchen (table QR / counter QR / POS). */
  origin?: OrderOrigin
  items: OrderItem[]
  note?: string
  /** Delivery orders only. */
  deliveryAddress?: string
  subtotal: number
  /** Central GST — half of the restaurant's GST rate, on the subtotal. */
  cgst: number
  /** State GST — the other half. */
  sgst: number
  total: number
  paid?: boolean
  placedAt: string // ISO datetime
  /** When the kitchen finished it — set once status is ready/completed. */
  servedAt?: string
}

// ---------- Activity / stats ----------
export type ActivityType =
  | 'order-placed'
  | 'order-ready'
  | 'order-completed'
  | 'order-cancelled'
  | 'item-sold-out'
  | 'table-added'
  | 'restaurant-created'

export interface ActivityEvent {
  id: string
  type: ActivityType
  message: string
  meta?: string // e.g. "Table 4"
  timestamp: string // ISO datetime
}

export type StatTone = 'default' | 'success' | 'warning' | 'info' | 'danger'

export interface StatRecord {
  id: string
  label: string
  value: string
  /** Percentage delta vs previous period; positive renders ▲ success, negative ▼ danger. */
  delta?: number
  deltaLabel?: string // "vs yesterday"
  tone?: StatTone
}

export interface SeriesPoint {
  label: string // x-axis label ("Jan", "9am", "Aug 3"…)
  value: number // primary series (yellow)
  secondary?: number // secondary series (bluesoft)
}

export interface DonutSlice {
  name: string
  value: number
}

export interface PopularItem {
  rank: number
  itemId: string
  name: string
  emoji: string
  qty: number
  revenue: number
  /** Percentage trend vs previous period. */
  trend: number
}

export interface ReportRangePreset {
  id: string
  label: string // "Last 7 days"
  from: string // ISO date
  to: string // ISO date
}

// ---------- Staff ----------
export type EmployeeStatus = 'active' | 'clocked-in' | 'on-leave' | 'inactive'

/** Built-ins: master, manager, cashier, kitchen, waiter — plus custom ids from Add role. */
export type StaffRoleId = string

export type PermissionKey =
  | 'takeOrders'
  | 'acceptPayment'
  | 'applyDiscount'
  | 'voidBill'
  | 'viewReports'
  | 'manageInventory'

/** Boolean grant, or a bound/conditional grant (e.g. discount ≤10%). */
export type PermissionGrant = boolean | { maxPct: number }

export interface StaffRole {
  id: StaffRoleId
  name: string
  /** Tailwind tint classes for shift chips / role badges. */
  colorClass: string
  bgClass: string
  permissions: Record<PermissionKey, PermissionGrant>
}

/** POS terminal permission toggles (PIN staff login). */
export interface PosStaffPermissions {
  posTerminal: boolean
  orders: boolean
  menu: boolean
  expenses: boolean
}

export interface Employee {
  id: string
  name: string
  phone: string
  email?: string
  roleId: StaffRoleId
  status: EmployeeStatus
  /** Hourly rate in ₹ — used by payroll summary. */
  hourlyRate: number
  joinedAt: string // ISO date
  /** Today's shift label when scheduled, e.g. "10:00–18:00". */
  shiftToday?: string
  /** 4–6 digit PIN for POS / crew login (demo only). */
  pin?: string
  /** When set, this person can sign into the POS terminal. */
  posAccess?: boolean
  posPermissions?: PosStaffPermissions
}

export interface Shift {
  id: string
  employeeId: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  start: string // "10:00"
  end: string // "18:00"
  roleId: StaffRoleId
}

export type AttendanceStatus = 'ok' | 'late' | 'early' | 'absent' | 'pending'

export interface AttendanceRow {
  id: string
  employeeId: string
  date: string
  scheduledStart: string
  scheduledEnd: string
  clockIn?: string
  clockOut?: string
  /** Minutes vs schedule; positive = late / overtime, negative = early. */
  varianceMinutes?: number
  status: AttendanceStatus
  /** Manager still needs to approve an anomaly. */
  needsApproval?: boolean
}

export interface PayrollRow {
  employeeId: string
  hours: number
  overtimeHours: number
  rate: number
  gross: number
  deductions: number
  net: number
}
