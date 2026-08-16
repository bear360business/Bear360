import { useEffect, useRef } from 'react'
import { useInventory } from '@/hooks/use-inventory'
import { useOrders } from '@/hooks/use-orders'
import { useServiceConfig } from '@/hooks/use-service-config'
import { useTables } from '@/hooks/use-tables'

const ACTIVE = new Set(['pending', 'preparing', 'ready', 'served'])

/**
 * Keeps the UI-only demo coherent: orders occupy tables, kitchen-ready /
 * completed tickets deduct recipe stock. No backend — pure client sync.
 */
export function DemoFlowBridge() {
  const { orders } = useOrders()
  const { reconcile } = useTables()
  const { deductForOrder } = useInventory()
  const { config: service } = useServiceConfig()
  const attempted = useRef<Set<string>>(new Set())

  useEffect(() => {
    const activeOrderByTable: Record<string, string> = {}
    for (const o of orders) {
      if (!o.tableId) continue
      if (o.orderType && o.orderType !== 'dine-in') continue
      if (!ACTIVE.has(o.status)) continue
      if (!activeOrderByTable[o.tableId]) activeOrderByTable[o.tableId] = o.id
    }
    reconcile(activeOrderByTable)
  }, [orders, reconcile])

  useEffect(() => {
    for (const o of orders) {
      // Kitchen "Mark done" → ready; board also uses served/completed.
      const byKitchen =
        o.status === 'ready' || o.status === 'completed' || o.status === 'served'
      const byPaid = service.deductStockOnPaid && o.paid === true
      if (!byKitchen && !byPaid) continue
      if (attempted.current.has(o.id)) continue
      attempted.current.add(o.id)
      deductForOrder(o.id, o.items)
    }
  }, [orders, deductForOrder, service.deductStockOnPaid])

  return null
}
