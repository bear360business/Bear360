import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOrders } from '@/hooks/use-orders'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import { useMockData } from '@/lib/runtime-config'
import {
  resolveDataVenueId,
  subscribeVenueScope,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

export const CUSTOMERS_STORAGE_KEY = 'bearqr:customers'

export type Customer = {
  id: string
  name: string
  phone: string
  email?: string
  notes?: string
  createdAt: string
  tags?: string[]
}

function readStored(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Customer[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(list: Customer[]) {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function norm(s: string) {
  return s.trim().toLowerCase()
}

function phoneDigits(s: string) {
  return s.replace(/\D/g, '')
}

export type CustomerRow = Customer & {
  orders: number
  spend: number
  lastVisit: string | null
}

/** Guest CRM — manual customers + auto rows from order names. */
export function useCustomers() {
  const mock = useMockData()
  const authTick = useAuthTick()
  const { orders } = useOrders()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [list, setList] = useState<Customer[]>(() => readStored())

  useEffect(() => subscribeVenueScope(() => setVenueId(resolveDataVenueId())), [])

  useEffect(() => {
    writeStored(list)
  }, [list])

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void apiGetVenueData<Customer[]>(venueId, 'customers')
      .then((rows) => {
        if (cancelled) return
        if (!Array.isArray(rows)) return
        writeStored(rows)
        setList(rows)
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  const persist = useCallback(
    (next: Customer[]) => {
      writeStored(next)
      if (!mock && getAccessToken()) {
        void apiPutVenueData(venueId, 'customers', next).catch((err) => reportApiError(err))
      }
    },
    [mock, venueId],
  )

  const upsert = useCallback(
    (customer: Customer) => {
      setList((prev) => {
        const phone = phoneDigits(customer.phone)
        const nameKey = norm(customer.name)
        const idx = prev.findIndex((c) => {
          if (c.id === customer.id) return true
          const cPhone = phoneDigits(c.phone)
          if (phone && cPhone && phone === cPhone) return true
          if (nameKey && norm(c.name) === nameKey) return true
          return false
        })
        let next: Customer[]
        if (idx >= 0) {
          next = [...prev]
          next[idx] = { ...prev[idx], ...customer, id: prev[idx].id }
        } else {
          next = [customer, ...prev]
        }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const remove = useCallback(
    (id: string) => {
      setList((prev) => {
        const next = prev.filter((c) => c.id !== id)
        persist(next)
        return next
      })
    },
    [persist],
  )

  const rows: CustomerRow[] = useMemo(() => {
    const byId = new Map<string, CustomerRow>()

    const ensure = (partial: CustomerRow) => {
      const phone = phoneDigits(partial.phone)
      const nameKey = norm(partial.name)
      for (const [id, row] of byId) {
        const rowPhone = phoneDigits(row.phone)
        if (phone && rowPhone && phone === rowPhone) {
          byId.set(id, {
            ...row,
            ...partial,
            id: row.id,
            phone: row.phone || partial.phone,
            orders: row.orders + partial.orders,
            spend: row.spend + partial.spend,
            lastVisit:
              !row.lastVisit || (partial.lastVisit && partial.lastVisit > row.lastVisit)
                ? partial.lastVisit
                : row.lastVisit,
          })
          return
        }
        if (nameKey && norm(row.name) === nameKey) {
          byId.set(id, {
            ...row,
            ...partial,
            id: row.id,
            phone: row.phone || partial.phone,
            orders: row.orders + partial.orders,
            spend: row.spend + partial.spend,
            lastVisit:
              !row.lastVisit || (partial.lastVisit && partial.lastVisit > row.lastVisit)
                ? partial.lastVisit
                : row.lastVisit,
          })
          return
        }
      }
      byId.set(partial.id, partial)
    }

    for (const c of list) {
      ensure({
        ...c,
        orders: 0,
        spend: 0,
        lastVisit: null,
      })
    }

    for (const o of orders) {
      const name = (o.customerName || '').trim()
      if (!name) continue
      const when = o.placedAt ?? null
      ensure({
        id: `auto-${norm(name).replace(/\s+/g, '-')}`,
        name,
        phone: '',
        createdAt: when?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        orders: 1,
        spend: o.total ?? 0,
        lastVisit: when,
      })
    }

    return [...byId.values()].sort((a, b) => b.spend - a.spend)
  }, [list, orders])

  return { customers: list, rows, upsert, remove }
}

export function createCustomerDraft(form: {
  name: string
  phone: string
  email?: string
  notes?: string
}): Customer {
  return {
    id: `cus-${Date.now().toString(36)}`,
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email?.trim() || undefined,
    notes: form.notes?.trim() || undefined,
    createdAt: new Date().toISOString().slice(0, 10),
  }
}
