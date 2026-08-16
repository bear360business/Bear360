import { apiRequest } from '@/lib/api-client'
import type { AttendanceRow, PayrollRow, Shift } from '@/lib/types'

export type PayrollBag = {
  periodLabel: string
  rows: PayrollRow[]
  approvedCurrent: boolean
}

export function apiGetAttendance(restaurantId: string) {
  return apiRequest<AttendanceRow[]>(`/restaurants/${restaurantId}/staff-ops/attendance`)
}

export function apiPutAttendance(restaurantId: string, rows: AttendanceRow[]) {
  return apiRequest<AttendanceRow[]>(`/restaurants/${restaurantId}/staff-ops/attendance`, {
    method: 'PUT',
    body: rows,
  })
}

export function apiGetPayroll(restaurantId: string) {
  return apiRequest<PayrollBag>(`/restaurants/${restaurantId}/staff-ops/payroll`)
}

export function apiPutPayroll(restaurantId: string, value: PayrollBag) {
  return apiRequest<PayrollBag>(`/restaurants/${restaurantId}/staff-ops/payroll`, {
    method: 'PUT',
    body: value,
  })
}

export function apiGetShifts(restaurantId: string) {
  return apiRequest<Shift[]>(`/restaurants/${restaurantId}/staff-ops/shifts`)
}

export function apiPutShifts(restaurantId: string, shifts: Shift[]) {
  return apiRequest<Shift[]>(`/restaurants/${restaurantId}/staff-ops/shifts`, {
    method: 'PUT',
    body: shifts,
  })
}
