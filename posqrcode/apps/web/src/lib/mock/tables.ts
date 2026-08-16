import type { DiningTable, TableZone } from '../types'

function make(
  number: number,
  seats: number,
  zone: TableZone,
  opts?: { activeOrderId?: string; reservationId?: string },
): DiningTable {
  const id = `t-${String(number).padStart(2, '0')}`
  const reserved = Boolean(opts?.reservationId)
  const occupied = Boolean(opts?.activeOrderId)
  return {
    id,
    name: `T-${String(number).padStart(2, '0')}`,
    number,
    seats,
    zone,
    status: occupied ? 'occupied' : reserved ? 'reserved' : 'free',
    ...(opts?.activeOrderId ? { activeOrderId: opts.activeOrderId } : {}),
    ...(opts?.reservationId ? { reservationId: opts.reservationId } : {}),
  }
}

/** 12 tables across zones · occupied / free / reserved mix. */
export const tableFixtures: DiningTable[] = [
  make(1, 4, 'Main hall', { activeOrderId: 'order-128' }),
  make(2, 2, 'Main hall', { activeOrderId: 'order-130' }),
  make(3, 6, 'Main hall', { activeOrderId: 'order-131' }),
  make(4, 4, 'Patio', { activeOrderId: 'order-132' }),
  make(5, 2, 'Patio'),
  make(6, 4, 'Main hall', { activeOrderId: 'order-133' }),
  make(7, 2, 'Bar', { reservationId: 'res-03' }),
  make(8, 6, 'Private', { activeOrderId: 'order-136' }),
  make(9, 4, 'Patio', { reservationId: 'res-01' }),
  make(10, 8, 'Private', { activeOrderId: 'order-135' }),
  make(11, 2, 'Bar'),
  make(12, 4, 'Main hall'),
]

export const tableZones: TableZone[] = ['Main hall', 'Patio', 'Private', 'Bar']

/** Live floor — synced by TablesProvider. */
export const tables: DiningTable[] = []

export function getTableById(id: string): DiningTable | undefined {
  return tables.find((t) => t.id === id)
}

export const occupiedTableCount = tables.filter((t) => t.status === 'occupied').length
export const freeTableCount = tables.filter((t) => t.status === 'free').length
export const reservedTableCount = tables.filter((t) => t.status === 'reserved').length

/** URL a table's QR code encodes. */
export function getTableQrUrl(restaurantSlug: string, tableId: string): string {
  return `${window.location.origin}/r/${restaurantSlug}/table/${tableId}`
}

/** URL the table-free counter QR encodes — takeaway/delivery without a table. */
export function getCounterQrUrl(restaurantSlug: string): string {
  return `${window.location.origin}/r/${restaurantSlug}`
}
