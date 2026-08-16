import { useCallback } from 'react'
import { useVenueBagState } from '@/hooks/use-venue-bag'
import { PLAN_META, type PlanId } from '@/lib/tenant'

export type BillingInvoice = {
  id: string
  date: string
  amount: number
  status: 'paid' | 'open'
  planId?: PlanId
}

const SEED: BillingInvoice[] = []

export function useBillingInvoices() {
  const { value: invoices, setValue: setInvoices, hydrated } = useVenueBagState<BillingInvoice[]>({
    storageKey: 'bearqr:billing-invoices',
    bag: 'billingInvoices',
    seed: SEED,
    isEmpty: (v) => !Array.isArray(v),
  })

  const appendForPlan = useCallback(
    (planId: PlanId) => {
      const meta = PLAN_META[planId]
      const amount = meta.priceMonthly ?? 0
      if (amount <= 0) return
      const now = new Date()
      const invoice: BillingInvoice = {
        id: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        date: now.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        amount,
        status: 'paid',
        planId,
      }
      setInvoices((prev) => [invoice, ...(Array.isArray(prev) ? prev : [])].slice(0, 24))
    },
    [setInvoices],
  )

  return { invoices: Array.isArray(invoices) ? invoices : [], appendForPlan, hydrated }
}
