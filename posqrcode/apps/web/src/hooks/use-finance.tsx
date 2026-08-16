import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOrders } from '@/hooks/use-orders'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import { localDate, localMonth, monthKeyFromIso } from '@/lib/local-date'
import { useMockData } from '@/lib/runtime-config'
import {
  resolveDataVenueId,
  subscribeVenueScope,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

export const FINANCE_STORAGE_KEY = 'bearqr:finance'

export type FinanceType = 'income' | 'expense'
export type FinanceCategory =
  | 'sales'
  | 'other-income'
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'wages'
  | 'marketing'
  | 'misc'

export type FinanceRecord = {
  id: string
  type: FinanceType
  category: FinanceCategory
  description: string
  amount: number
  /** YYYY-MM-DD */
  date: string
  /** Synthetic paid-order row — not deletable. */
  fromOrder?: boolean
}

function readStored(): FinanceRecord[] {
  try {
    const raw = localStorage.getItem(FINANCE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FinanceRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(list: FinanceRecord[]) {
  try {
    localStorage.setItem(FINANCE_STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

/** Manual income/expense ledger + paid-order income for the selected month. */
export function useFinance(month: string) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const { orders } = useOrders()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [records, setRecords] = useState<FinanceRecord[]>(() => readStored())

  useEffect(() => subscribeVenueScope(() => setVenueId(resolveDataVenueId())), [])

  useEffect(() => {
    writeStored(records)
  }, [records])

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void apiGetVenueData<FinanceRecord[]>(venueId, 'finance')
      .then((rows) => {
        if (cancelled) return
        if (!Array.isArray(rows)) return
        writeStored(rows)
        setRecords(rows)
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  const persist = useCallback(
    (next: FinanceRecord[]) => {
      writeStored(next)
      if (!mock && getAccessToken()) {
        void apiPutVenueData(venueId, 'finance', next).catch((err) => reportApiError(err))
      }
    },
    [mock, venueId],
  )

  const add = useCallback(
    (draft: Omit<FinanceRecord, 'id'>) => {
      const row: FinanceRecord = { ...draft, id: `fin-${Date.now().toString(36)}` }
      setRecords((prev) => {
        const next = [row, ...prev]
        persist(next)
        return next
      })
      return row
    },
    [persist],
  )

  const remove = useCallback(
    (id: string) => {
      setRecords((prev) => {
        const next = prev.filter((r) => r.id !== id && !r.fromOrder)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const orderRows: FinanceRecord[] = useMemo(() => {
    return orders
      .filter((o) => o.paid && monthKeyFromIso(o.placedAt) === month)
      .map((o) => ({
        id: `order-${o.id}`,
        type: 'income' as const,
        category: 'sales' as const,
        description: `Order #${o.number}${o.customerName ? ` · ${o.customerName}` : ''}`,
        amount: o.total,
        date: localDate(new Date(o.placedAt)),
        fromOrder: true,
      }))
  }, [orders, month])

  const manual = useMemo(
    () => records.filter((r) => r.date.slice(0, 7) === month),
    [records, month],
  )

  const displayRecords = useMemo(
    () => [...orderRows, ...manual].sort((a, b) => b.date.localeCompare(a.date)),
    [orderRows, manual],
  )

  const orderIncome = orderRows.reduce((s, r) => s + r.amount, 0)
  const income =
    orderIncome + manual.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const expenses = manual.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

  return {
    records: displayRecords,
    add,
    remove,
    income,
    expenses,
    net: income - expenses,
    orderIncome,
    localMonth,
    localDate,
  }
}

export { localMonth, localDate }
