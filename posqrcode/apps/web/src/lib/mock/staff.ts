// Staff fixtures for the admin Staff module (v2 doc §8.5).
// Seat usage is kept in sync with active employees via `activeSeatCount`.

import type {
  AttendanceRow,
  Employee,
  PayrollRow,
  PermissionKey,
  Shift,
  StaffRole,
  StaffRoleId,
} from '@/lib/types'

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  takeOrders: 'Take orders',
  acceptPayment: 'Accept payment',
  applyDiscount: 'Apply discount',
  voidBill: 'Void bill',
  viewReports: 'View reports',
  manageInventory: 'Manage inventory',
}

export const seedStaffRoles: StaffRole[] = [
  {
    id: 'master',
    name: 'Master',
    colorClass: 'text-brand',
    bgClass: 'bg-brand-tint',
    permissions: {
      takeOrders: true,
      acceptPayment: true,
      applyDiscount: true,
      voidBill: true,
      viewReports: true,
      manageInventory: true,
    },
  },
  {
    id: 'manager',
    name: 'Manager',
    colorClass: 'text-foreground',
    bgClass: 'bg-surface-muted',
    permissions: {
      takeOrders: true,
      acceptPayment: true,
      applyDiscount: true,
      voidBill: true,
      viewReports: true,
      manageInventory: true,
    },
  },
  {
    id: 'cashier',
    name: 'Cashier',
    colorClass: 'text-info',
    bgClass: 'bg-info-tint',
    permissions: {
      takeOrders: true,
      acceptPayment: true,
      applyDiscount: { maxPct: 10 },
      voidBill: false,
      viewReports: false,
      manageInventory: false,
    },
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    colorClass: 'text-warning',
    bgClass: 'bg-warning-tint',
    permissions: {
      takeOrders: false,
      acceptPayment: false,
      applyDiscount: false,
      voidBill: false,
      viewReports: false,
      manageInventory: true,
    },
  },
  {
    id: 'waiter',
    name: 'Waiter',
    colorClass: 'text-success',
    bgClass: 'bg-success-tint',
    permissions: {
      takeOrders: true,
      acceptPayment: false,
      applyDiscount: false,
      voidBill: false,
      viewReports: false,
      manageInventory: false,
    },
  },
]

/** Live roles matrix — synced by RolesPage localStorage. */
export const staffRoles: StaffRole[] = seedStaffRoles.map((r) => ({
  ...r,
  permissions: { ...r.permissions },
}))

export function syncStaffRolesMock(list: StaffRole[]) {
  staffRoles.splice(
    0,
    staffRoles.length,
    ...list.map((r) => ({ ...r, permissions: { ...r.permissions } })),
  )
}

export const seedEmployees: Employee[] = [
  {
    id: 'emp-01',
    name: 'Aarav Mehta',
    phone: '+91 98765 41001',
    email: 'aarav@masalabear.in',
    roleId: 'manager',
    status: 'clocked-in',
    hourlyRate: 220,
    joinedAt: '2024-03-12',
    shiftToday: '09:00–18:00',
    pin: '1111',
    posAccess: true,
    posPermissions: {
      posTerminal: true,
      orders: true,
      menu: true,
      expenses: true,
    },
  },
  {
    id: 'emp-02',
    name: 'Priya Nair',
    phone: '+91 98765 41002',
    email: 'priya@masalabear.in',
    roleId: 'cashier',
    status: 'clocked-in',
    hourlyRate: 140,
    joinedAt: '2024-06-01',
    shiftToday: '10:00–19:00',
    pin: '1234',
    posAccess: true,
    posPermissions: {
      posTerminal: true,
      orders: true,
      menu: false,
      expenses: true,
    },
  },
  {
    id: 'emp-03',
    name: 'Kabir Singh',
    phone: '+91 98765 41003',
    roleId: 'kitchen',
    status: 'clocked-in',
    hourlyRate: 160,
    joinedAt: '2024-08-18',
    shiftToday: '11:00–20:00',
    // Kitchen crew use the Kitchen email portal for KDS — not staff PIN sidebar.
  },
  {
    id: 'emp-04',
    name: 'Ananya Desai',
    phone: '+91 98765 41004',
    roleId: 'waiter',
    status: 'active',
    hourlyRate: 120,
    joinedAt: '2025-01-09',
    shiftToday: '16:00–23:00',
    pin: '2222',
    posAccess: true,
    posPermissions: {
      posTerminal: true,
      orders: true,
      menu: false,
      expenses: false,
    },
  },
  {
    id: 'emp-05',
    name: 'Rohan Iyer',
    phone: '+91 98765 41005',
    roleId: 'waiter',
    status: 'on-leave',
    hourlyRate: 120,
    joinedAt: '2025-02-22',
  },
]

/** Live roster — synced by `useStaff` (starts empty; never seed fixtures). */
export const employees: Employee[] = []

export function syncEmployeesMock(list: Employee[]) {
  employees.splice(0, employees.length, ...list.map((e) => ({ ...e })))
}

/** Seats that count against the plan limit (excludes inactive). */
export function getActiveSeatCount(): number {
  return employees.filter((e) => e.status !== 'inactive').length
}

/** @deprecated Prefer getActiveSeatCount() */
export const activeSeatCount = seedEmployees.filter((e) => e.status !== 'inactive').length

export function getRole(id: StaffRoleId): StaffRole {
  return staffRoles.find((r) => r.id === id) ?? staffRoles[0]
}

export function getEmployee(id: string): Employee | undefined {
  return employees.find((e) => e.id === id)
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Hours between HH:mm strings (same-day). */
export function shiftHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
}

// Week of 3–9 Aug 2026 (Mon–Sun) — aligns with "today" in the product demo.
const WEEK = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09']

export const scheduleWeekDays = WEEK

export const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const shifts: Shift[] = [
  // Aarav — manager, weekdays
  { id: 'sh-01', employeeId: 'emp-01', date: '2026-08-03', start: '09:00', end: '18:00', roleId: 'manager' },
  { id: 'sh-02', employeeId: 'emp-01', date: '2026-08-04', start: '09:00', end: '18:00', roleId: 'manager' },
  { id: 'sh-03', employeeId: 'emp-01', date: '2026-08-05', start: '09:00', end: '18:00', roleId: 'manager' },
  { id: 'sh-04', employeeId: 'emp-01', date: '2026-08-06', start: '09:00', end: '18:00', roleId: 'manager' },
  { id: 'sh-05', employeeId: 'emp-01', date: '2026-08-07', start: '09:00', end: '18:00', roleId: 'manager' },
  // Priya — cashier
  { id: 'sh-06', employeeId: 'emp-02', date: '2026-08-03', start: '10:00', end: '19:00', roleId: 'cashier' },
  { id: 'sh-07', employeeId: 'emp-02', date: '2026-08-04', start: '10:00', end: '19:00', roleId: 'cashier' },
  { id: 'sh-08', employeeId: 'emp-02', date: '2026-08-05', start: '10:00', end: '19:00', roleId: 'cashier' },
  { id: 'sh-09', employeeId: 'emp-02', date: '2026-08-07', start: '10:00', end: '19:00', roleId: 'cashier' },
  { id: 'sh-10', employeeId: 'emp-02', date: '2026-08-08', start: '11:00', end: '20:00', roleId: 'cashier' },
  // Kabir — kitchen
  { id: 'sh-11', employeeId: 'emp-03', date: '2026-08-03', start: '11:00', end: '20:00', roleId: 'kitchen' },
  { id: 'sh-12', employeeId: 'emp-03', date: '2026-08-04', start: '11:00', end: '20:00', roleId: 'kitchen' },
  { id: 'sh-13', employeeId: 'emp-03', date: '2026-08-05', start: '11:00', end: '20:00', roleId: 'kitchen' },
  { id: 'sh-14', employeeId: 'emp-03', date: '2026-08-06', start: '11:00', end: '20:00', roleId: 'kitchen' },
  { id: 'sh-15', employeeId: 'emp-03', date: '2026-08-07', start: '11:00', end: '20:00', roleId: 'kitchen' },
  { id: 'sh-16', employeeId: 'emp-03', date: '2026-08-08', start: '12:00', end: '22:00', roleId: 'kitchen' },
  // Ananya — waiter evenings
  { id: 'sh-17', employeeId: 'emp-04', date: '2026-08-03', start: '16:00', end: '23:00', roleId: 'waiter' },
  { id: 'sh-18', employeeId: 'emp-04', date: '2026-08-05', start: '16:00', end: '23:00', roleId: 'waiter' },
  { id: 'sh-19', employeeId: 'emp-04', date: '2026-08-06', start: '16:00', end: '23:00', roleId: 'waiter' },
  { id: 'sh-20', employeeId: 'emp-04', date: '2026-08-07', start: '16:00', end: '23:00', roleId: 'waiter' },
  { id: 'sh-21', employeeId: 'emp-04', date: '2026-08-08', start: '12:00', end: '22:00', roleId: 'waiter' },
  { id: 'sh-22', employeeId: 'emp-04', date: '2026-08-09', start: '12:00', end: '22:00', roleId: 'waiter' },
]

export interface DayCoverage {
  date: string
  label: string
  staffCount: number
  /** Peak hour label from forecast, e.g. "7pm". */
  peakLabel: string
  understaffed: boolean
}

export const weekCoverage: DayCoverage[] = WEEK.map((date, i) => {
  const staffCount = shifts.filter((s) => s.date === date).length
  const understaffed = staffCount < 3 || (i === 5 && staffCount < 4) // Sat needs more
  return {
    date,
    label: weekDayLabels[i],
    staffCount,
    peakLabel: i === 5 || i === 6 ? '8pm' : '7pm',
    understaffed,
  }
})

export function shiftsFor(employeeId: string, date: string): Shift[] {
  return shifts.filter((s) => s.employeeId === employeeId && s.date === date)
}

/** Today's attendance — Friday 7 Aug 2026. */
export const ATTENDANCE_TODAY = '2026-08-07'

export const attendanceToday: AttendanceRow[] = [
  {
    id: 'att-01',
    employeeId: 'emp-01',
    date: ATTENDANCE_TODAY,
    scheduledStart: '09:00',
    scheduledEnd: '18:00',
    clockIn: '08:54',
    clockOut: undefined,
    varianceMinutes: -6,
    status: 'ok',
  },
  {
    id: 'att-02',
    employeeId: 'emp-02',
    date: ATTENDANCE_TODAY,
    scheduledStart: '10:00',
    scheduledEnd: '19:00',
    clockIn: '10:12',
    clockOut: undefined,
    varianceMinutes: 12,
    status: 'late',
    needsApproval: true,
  },
  {
    id: 'att-03',
    employeeId: 'emp-03',
    date: ATTENDANCE_TODAY,
    scheduledStart: '11:00',
    scheduledEnd: '20:00',
    clockIn: '10:58',
    clockOut: undefined,
    varianceMinutes: -2,
    status: 'ok',
  },
  {
    id: 'att-04',
    employeeId: 'emp-04',
    date: ATTENDANCE_TODAY,
    scheduledStart: '16:00',
    scheduledEnd: '23:00',
    status: 'pending',
  },
  {
    id: 'att-05',
    employeeId: 'emp-05',
    date: ATTENDANCE_TODAY,
    scheduledStart: '12:00',
    scheduledEnd: '20:00',
    status: 'absent',
    needsApproval: true,
  },
]

export const unapprovedAttendanceCount = attendanceToday.filter((a) => a.needsApproval).length

/** Current pay period: 1–7 Aug 2026 (partial month-to-date). */
export const payrollPeriodLabel = '1–7 Aug 2026'

export const payrollRows: PayrollRow[] = [
  { employeeId: 'emp-01', hours: 45, overtimeHours: 1, rate: 220, gross: 10120, deductions: 480, net: 9640 },
  { employeeId: 'emp-02', hours: 40, overtimeHours: 2, rate: 140, gross: 6160, deductions: 280, net: 5880 },
  { employeeId: 'emp-03', hours: 48, overtimeHours: 4, rate: 160, gross: 8320, deductions: 360, net: 7960 },
  { employeeId: 'emp-04', hours: 35, overtimeHours: 0, rate: 120, gross: 4200, deductions: 180, net: 4020 },
  { employeeId: 'emp-05', hours: 0, overtimeHours: 0, rate: 120, gross: 0, deductions: 0, net: 0 },
]

export const payrollTotals = payrollRows.reduce(
  (acc, r) => ({
    hours: acc.hours + r.hours,
    overtimeHours: acc.overtimeHours + r.overtimeHours,
    gross: acc.gross + r.gross,
    deductions: acc.deductions + r.deductions,
    net: acc.net + r.net,
  }),
  { hours: 0, overtimeHours: 0, gross: 0, deductions: 0, net: 0 },
)

export function formatVariance(minutes: number | undefined): string | null {
  if (minutes === undefined || minutes === 0) return null
  const abs = Math.abs(minutes)
  const label = abs >= 60 ? `${Math.floor(abs / 60)}h ${abs % 60}m` : `${abs}m`
  return minutes > 0 ? `+${label} late` : `−${label} early`
}
