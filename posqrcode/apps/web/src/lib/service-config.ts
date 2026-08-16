// Restaurant service options the admin controls dynamically
// (Settings → Service): which order types customers may choose + delivery fee.

import { getIndustryProfile } from './industries-catalog'
import type { IndustryId } from './industries'
import type { OrderType } from './types'

export interface ServiceConfig {
  orderTypes: Record<OrderType, boolean>
  /** Flat delivery fee in ₹, added to the taxable bill for delivery orders. */
  deliveryFee: number
  /**
   * Table-free ordering: one counter QR (/r/:restaurantId) that works with no
   * table at all — for kiosks, takeaway counters and cloud kitchens.
   */
  counterOrdering: boolean
  /**
   * When true, recipe stock also deducts when an order is paid (useful for
   * counter-only venues that skip kitchen "served"). Default flow still
   * deducts on served/completed.
   */
  deductStockOnPaid: boolean
}

export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  orderTypes: { 'dine-in': true, takeaway: true, delivery: true },
  deliveryFee: 49,
  counterOrdering: true,
  deductStockOnPaid: false,
}

export const SERVICE_CONFIG_STORAGE_KEY = 'bearqr:service-config'

export const ORDER_TYPE_META: { id: OrderType; label: string; emoji: string; caption: string }[] = [
  { id: 'dine-in', label: 'Dine-in', emoji: '🍽️', caption: 'Served at the table' },
  { id: 'takeaway', label: 'Takeaway', emoji: '🥡', caption: 'Pick up at the counter' },
  { id: 'delivery', label: 'Delivery', emoji: '🛵', caption: 'Delivered to your address' },
]

/** Types a customer may pick when there is no table in play (dine-in needs one). */
export function tableFreeOrderTypes(enabled: OrderType[]): OrderType[] {
  return enabled.filter((t) => t !== 'dine-in')
}

export function mergeServiceConfig(stored: unknown): ServiceConfig {
  const s = (stored ?? {}) as Partial<{
    orderTypes: Partial<Record<OrderType, boolean>>
    deliveryFee: number
    counterOrdering: boolean
    deductStockOnPaid: boolean
  }>
  return {
    orderTypes: { ...DEFAULT_SERVICE_CONFIG.orderTypes, ...s.orderTypes },
    deliveryFee:
      typeof s.deliveryFee === 'number' && s.deliveryFee >= 0
        ? s.deliveryFee
        : DEFAULT_SERVICE_CONFIG.deliveryFee,
    counterOrdering:
      typeof s.counterOrdering === 'boolean'
        ? s.counterOrdering
        : DEFAULT_SERVICE_CONFIG.counterOrdering,
    deductStockOnPaid:
      typeof s.deductStockOnPaid === 'boolean'
        ? s.deductStockOnPaid
        : DEFAULT_SERVICE_CONFIG.deductStockOnPaid,
  }
}

/** Apply an industry pack's service defaults (keeps delivery fee). */
export function serviceConfigFromIndustry(
  industryId: IndustryId | string | undefined,
  current?: ServiceConfig,
): ServiceConfig {
  const profile = getIndustryProfile(industryId)
  return {
    orderTypes: { ...profile.serviceDefaults.orderTypes },
    counterOrdering: profile.serviceDefaults.counterOrdering,
    deliveryFee: current?.deliveryFee ?? DEFAULT_SERVICE_CONFIG.deliveryFee,
    deductStockOnPaid: current?.deductStockOnPaid ?? DEFAULT_SERVICE_CONFIG.deductStockOnPaid,
  }
}
