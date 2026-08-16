/**
 * The customer app has two entry points:
 *   /r/:restaurantId/table/:tableId  — a table QR (dine-in possible)
 *   /r/:restaurantId                 — the counter QR, no table at all
 * Everything below (menu, cart, success) hangs off whichever base opened it.
 */
export function customerBase(restaurantId: string, tableId?: string): string {
  return tableId ? `/r/${restaurantId}/table/${tableId}` : `/r/${restaurantId}`
}

/** Storage suffix for a session — table-free sessions share the "counter" bucket. */
export function sessionKey(tableId?: string): string {
  return tableId || 'counter'
}
