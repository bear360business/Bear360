import type {
  ActivityEvent,
  DonutSlice,
  PopularItem,
  ReportRangePreset,
  SeriesPoint,
  StatRecord,
} from '../types'

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const daysAgoIso = (d: number) =>
  new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10)

// ---------- Super Admin dashboard ----------

export const superStats: StatRecord[] = [
  { id: 'restaurants', label: 'Restaurants', value: '128', delta: 12, deltaLabel: 'vs last month' },
  { id: 'mrr', label: 'MRR', value: '₹2,61,480', delta: 8, deltaLabel: 'vs last month' },
  { id: 'orders', label: 'Orders', value: '45.2k', delta: -3, deltaLabel: 'vs last month' },
  { id: 'active-tables', label: 'Active tables', value: '940', delta: 5, deltaLabel: 'vs last month' },
]

/** Monthly platform revenue in ₹ (primary) + previous year (secondary). */
export const platformRevenueSeries: SeriesPoint[] = [
  { label: 'Jan', value: 134500, secondary: 89200 },
  { label: 'Feb', value: 148900, secondary: 96800 },
  { label: 'Mar', value: 163400, secondary: 108200 },
  { label: 'Apr', value: 174800, secondary: 117600 },
  { label: 'May', value: 191200, secondary: 128300 },
  { label: 'Jun', value: 214600, secondary: 142900 },
  { label: 'Jul', value: 239400, secondary: 153600 },
  { label: 'Aug', value: 261480, secondary: 166100 },
]

/** Plan mix donut (Starter / Pro / Enterprise). */
export const planMixSlices: DonutSlice[] = [
  { name: 'Pro', value: 71 },
  { name: 'Starter', value: 42 },
  { name: 'Enterprise', value: 15 },
]

// ---------- Restaurant Admin dashboard ----------

export const restaurantStats: StatRecord[] = [
  { id: 'orders-today', label: "Today's orders", value: '47', delta: 12, deltaLabel: 'vs yesterday' },
  { id: 'revenue-today', label: 'Revenue', value: '₹45,280', delta: 8, deltaLabel: 'vs yesterday' },
  { id: 'pending', label: 'Pending', value: '6', tone: 'warning' },
  { id: 'completed', label: 'Completed', value: '38', tone: 'success' },
]

/** Hourly sales today in ₹ (bar chart). */
export const salesTodaySeries: SeriesPoint[] = [
  { label: '9am', value: 1450 },
  { label: '10am', value: 2380 },
  { label: '11am', value: 4120 },
  { label: '12pm', value: 8460 },
  { label: '1pm', value: 9240 },
  { label: '2pm', value: 5180 },
  { label: '3pm', value: 3360 },
  { label: '4pm', value: 2940 },
  { label: '5pm', value: 4620 },
  { label: '6pm', value: 3150 },
]

export const salesWeekSeries: SeriesPoint[] = [
  { label: 'Mon', value: 32800 },
  { label: 'Tue', value: 35400 },
  { label: 'Wed', value: 30900 },
  { label: 'Thu', value: 45280 },
  { label: 'Fri', value: 56700 },
  { label: 'Sat', value: 69300 },
  { label: 'Sun', value: 53900 },
]

export const salesMonthSeries: SeriesPoint[] = [
  { label: 'W1', value: 213500 },
  { label: 'W2', value: 238000 },
  { label: 'W3', value: 257200 },
  { label: 'W4', value: 294800 },
]

export const popularItems: PopularItem[] = [
  { rank: 1, itemId: 'butter-chicken', name: 'Butter Chicken', emoji: '🍛', qty: 32, revenue: 11168, trend: 12 },
  { rank: 2, itemId: 'chicken-biryani', name: 'Hyderabadi Chicken Biryani', emoji: '🍚', qty: 26, revenue: 8554, trend: 9 },
  { rank: 3, itemId: 'masala-dosa', name: 'Masala Dosa', emoji: '🥞', qty: 24, revenue: 3576, trend: 6 },
  { rank: 4, itemId: 'paneer-butter-masala', name: 'Paneer Butter Masala', emoji: '🥘', qty: 18, revenue: 5382, trend: -2 },
  { rank: 5, itemId: 'masala-chai', name: 'Masala Chai', emoji: '☕', qty: 21, revenue: 1029, trend: 3 },
]

export const activityFeed: ActivityEvent[] = [
  { id: 'ev-1', type: 'order-placed', message: 'Order #132 placed', meta: 'Table 4', timestamp: minutesAgo(2) },
  { id: 'ev-2', type: 'order-ready', message: 'Order #128 ready', meta: 'Table 1', timestamp: minutesAgo(6) },
  { id: 'ev-3', type: 'order-placed', message: 'Order #131 placed', meta: 'Table 3', timestamp: minutesAgo(9) },
  { id: 'ev-4', type: 'item-sold-out', message: 'Mutton Seekh Kebab marked sold out', meta: 'Starters', timestamp: minutesAgo(14) },
  { id: 'ev-5', type: 'order-completed', message: 'Order #127 completed', meta: 'Table 6', timestamp: minutesAgo(26) },
  { id: 'ev-6', type: 'order-cancelled', message: 'Order #116 cancelled', meta: 'Table 9', timestamp: minutesAgo(140) },
  { id: 'ev-7', type: 'table-added', message: 'Table T-12 added', meta: '4 seats', timestamp: minutesAgo(210) },
]

// ---------- Reports ----------

export const reportStats: StatRecord[] = [
  { id: 'revenue', label: 'Revenue', value: '₹2.95L', delta: 11, deltaLabel: 'vs prev. period' },
  { id: 'orders', label: 'Orders', value: '312', delta: 7, deltaLabel: 'vs prev. period' },
  { id: 'avg-order', label: 'Avg order', value: '₹946', delta: -1, deltaLabel: 'vs prev. period' },
  { id: 'top-item', label: 'Top item', value: 'Biryani', tone: 'info' },
]

/** Daily revenue in ₹ for the selected range + previous-period ghost line. */
export const reportRevenueSeries: SeriesPoint[] = [
  { label: 'Aug 1', value: 36400, secondary: 31800 },
  { label: 'Aug 2', value: 41300, secondary: 34300 },
  { label: 'Aug 3', value: 33600, secondary: 35700 },
  { label: 'Aug 4', value: 43100, secondary: 37100 },
  { label: 'Aug 5', value: 45900, secondary: 40300 },
  { label: 'Aug 6', value: 49700, secondary: 41300 },
  { label: 'Aug 7', value: 45280, secondary: 42400 },
]

/** Orders per day (bar chart). */
export const reportOrdersSeries: SeriesPoint[] = [
  { label: 'Aug 1', value: 39 },
  { label: 'Aug 2', value: 44 },
  { label: 'Aug 3', value: 36 },
  { label: 'Aug 4', value: 46 },
  { label: 'Aug 5', value: 49 },
  { label: 'Aug 6', value: 51 },
  { label: 'Aug 7', value: 47 },
]

export const categoryMixSlices: DonutSlice[] = [
  { name: 'North Indian', value: 36 },
  { name: 'Rice & Biryani', value: 24 },
  { name: 'Starters', value: 18 },
  { name: 'South Indian', value: 12 },
  { name: 'Street Food', value: 10 },
]

export const topItemsReport: PopularItem[] = [
  ...popularItems,
  { rank: 6, itemId: 'tandoori-chicken', name: 'Tandoori Chicken (Half)', emoji: '🍗', qty: 12, revenue: 4188, trend: 4 },
  { rank: 7, itemId: 'mutton-biryani', name: 'Mutton Biryani', emoji: '🍛', qty: 10, revenue: 3990, trend: 15 },
  { rank: 8, itemId: 'pav-bhaji', name: 'Pav Bhaji', emoji: '🍞', qty: 9, revenue: 1341, trend: -3 },
  { rank: 9, itemId: 'gulab-jamun', name: 'Gulab Jamun (2 pc)', emoji: '🍮', qty: 8, revenue: 792, trend: 2 },
  { rank: 10, itemId: 'mango-lassi', name: 'Mango Lassi', emoji: '🥭', qty: 7, revenue: 763, trend: 1 },
]

export const reportRangePresets: ReportRangePreset[] = [
  { id: 'today', label: 'Today', from: daysAgoIso(0), to: daysAgoIso(0) },
  { id: '7d', label: 'Last 7 days', from: daysAgoIso(6), to: daysAgoIso(0) },
  { id: '30d', label: 'Last 30 days', from: daysAgoIso(29), to: daysAgoIso(0) },
  { id: 'month', label: 'This month', from: daysAgoIso(6).slice(0, 8) + '01', to: daysAgoIso(0) },
]

// ---------- Notifications (TopHeader popover) ----------

export const notifications: ActivityEvent[] = activityFeed.slice(0, 4)
