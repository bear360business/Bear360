import { useCallback, useMemo } from 'react'
import { useVenueBagState } from '@/hooks/use-venue-bag'
import {
  apiGetAttendance,
  apiGetPayroll,
  apiGetShifts,
  apiPutAttendance,
  apiPutPayroll,
  apiPutShifts,
  type PayrollBag,
} from '@/lib/api-staff-ops'
import type { AttendanceRow, PayrollRow, Shift } from '@/lib/types'

export type { PayrollBag }

const EMPTY_PAYROLL: PayrollBag = {
  periodLabel: '',
  rows: [],
  approvedCurrent: false,
}

/** Schedule — persists via `/staff-ops/shifts`. */
export function useShifts() {
  const { value: shifts, setValue: setShifts, hydrated } = useVenueBagState<Shift[]>({
    storageKey: 'bearqr:shifts',
    bag: 'shifts',
    seed: [],
    isEmpty: (v) => !Array.isArray(v) || v.length === 0,
    load: apiGetShifts,
    save: apiPutShifts,
  })

  return { shifts, setShifts, hydrated }
}

/** Attendance — persists via `/staff-ops/attendance`. */
export function useAttendance() {
  const { value: rows, setValue: setRows, hydrated } = useVenueBagState<AttendanceRow[]>({
    storageKey: 'bearqr:attendance',
    bag: 'attendance',
    seed: [],
    isEmpty: (v) => !Array.isArray(v) || v.length === 0,
    load: apiGetAttendance,
    save: apiPutAttendance,
  })

  const approve = useCallback(
    (id: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                needsApproval: false,
                status: r.status === 'absent' ? 'absent' : r.status === 'late' ? 'ok' : r.status,
              }
            : r,
        ),
      )
    },
    [setRows],
  )

  return { rows, setRows, approve, hydrated }
}

/** Payroll — persists via `/staff-ops/payroll`. */
export function usePayroll() {
  const { value, setValue, hydrated } = useVenueBagState<PayrollBag>({
    storageKey: 'bearqr:payroll',
    bag: 'payroll',
    seed: EMPTY_PAYROLL,
    isEmpty: (v) => !v || !Array.isArray(v.rows) || v.rows.length === 0,
    load: apiGetPayroll,
    save: apiPutPayroll,
  })

  const setApprovedCurrent = useCallback(
    (approved: boolean) => {
      setValue((prev) => ({ ...prev, approvedCurrent: approved }))
    },
    [setValue],
  )

  const setRows = useCallback(
    (rows: PayrollRow[]) => {
      setValue((prev) => ({ ...prev, rows }))
    },
    [setValue],
  )

  const periodLabel = useMemo(() => {
    if (value.periodLabel) return value.periodLabel
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
  }, [value.periodLabel])

  return {
    rows: value.rows ?? [],
    periodLabel,
    approvedCurrent: Boolean(value.approvedCurrent),
    setApprovedCurrent,
    setRows,
    hydrated,
  }
}
