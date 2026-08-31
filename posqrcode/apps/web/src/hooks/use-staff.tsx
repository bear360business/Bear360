import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiListEmployees, apiRemoveEmployee, apiUpsertEmployee } from '@/lib/api-catalog'
import { getAccessToken } from '@/lib/api-client'
import { syncEmployeesMock } from '@/lib/mock/staff'
import { useMockData } from '@/lib/runtime-config'
import type { Employee, EmployeeStatus, StaffRoleId } from '@/lib/types'
import { resolveDataVenueId, subscribeVenueScope } from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

const STAFF_STORAGE_KEY = 'bearqr:staff'

interface StaffContextValue {
  employees: Employee[]
  activeCount: number
  upsert: (employee: Employee) => void
  setStatus: (id: string, status: EmployeeStatus) => void
  remove: (id: string) => void
}

const StaffContext = createContext<StaffContextValue | null>(null)

function readStored(): Employee[] {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Employee[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(list: Employee[]) {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function StaffProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [list, setList] = useState<Employee[]>(() => {
    const initial = mock ? readStored() : []
    syncEmployeesMock(initial)
    return initial
  })

  useEffect(() => {
    writeStored(list)
    syncEmployeesMock(list)
  }, [list])

  useEffect(() => subscribeVenueScope(() => setVenueId(resolveDataVenueId())), [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STAFF_STORAGE_KEY || e.key === null) {
        const next = readStored()
        syncEmployeesMock(next)
        setList(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void apiListEmployees(venueId)
      .then((rows) => {
        if (cancelled) return
        const mapped = rows.map((e) => ({
          ...e,
          status: (e.status as EmployeeStatus) || 'active',
          pin: e.pin,
        }))
        setList(mapped)
        syncEmployeesMock(mapped)
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  const upsert = useCallback(
    (employee: Employee) => {
      setList((prev) => {
        const idx = prev.findIndex((e) => e.id === employee.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = employee
          return next
        }
        return [...prev, employee]
      })
      if (!mock) {
        void apiUpsertEmployee(venueId, employee)
          .then((saved) => {
            if (saved && saved.id) {
              setList((prev) =>
                prev.map((e) => (e.id === employee.id ? { ...e, ...saved } : e)),
              )
            }
          })
          .catch((err) => reportApiError(err))
      }
    },
    [mock, venueId],
  )

  const setStatus = useCallback(
    (id: string, status: EmployeeStatus) => {
      setList((prev) => {
        const next = prev.map((e) =>
          e.id === id
            ? { ...e, status, shiftToday: status === 'inactive' ? undefined : e.shiftToday }
            : e,
        )
        const hit = next.find((e) => e.id === id)
        if (hit && !mock) void apiUpsertEmployee(venueId, hit).catch((err) => reportApiError(err))
        return next
      })
    },
    [mock, venueId],
  )

  const remove = useCallback(
    (id: string) => {
      setList((prev) => prev.filter((e) => e.id !== id))
      if (!mock) void apiRemoveEmployee(venueId, id).catch((err) => reportApiError(err))
    },
    [mock, venueId],
  )

  const value = useMemo<StaffContextValue>(
    () => ({
      employees: list,
      activeCount: list.filter((e) => e.status !== 'inactive').length,
      upsert,
      setStatus,
      remove,
    }),
    [list, upsert, setStatus, remove],
  )

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>
}

export function useStaff(): StaffContextValue {
  const ctx = useContext(StaffContext)
  if (!ctx) throw new Error('useStaff must be used within a <StaffProvider>')
  return ctx
}

export function defaultHourlyRate(roleId: StaffRoleId): number {
  if (roleId === 'master') return 280
  if (roleId === 'manager') return 220
  if (roleId === 'kitchen') return 160
  if (roleId === 'cashier') return 140
  if (roleId === 'waiter') return 120
  return 200
}

export function createEmployeeDraft(form: {
  name: string
  phone: string
  roleId: StaffRoleId
  email?: string
  hourlyRate?: number
}): Employee {
  const email = form.email?.trim()
  return {
    id: `emp-${Date.now().toString(36)}`,
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: email || undefined,
    roleId: form.roleId,
    status: 'active',
    hourlyRate: form.hourlyRate && form.hourlyRate > 0 ? form.hourlyRate : defaultHourlyRate(form.roleId),
    joinedAt: new Date().toISOString().slice(0, 10),
  }
}
