import type { Employee, PosStaffPermissions } from '@/lib/types'

/** Safe fallback when permissions are missing — grant nothing. */
export const EMPTY_POS_PERMS: PosStaffPermissions = {
  posTerminal: false,
  orders: false,
  menu: false,
  expenses: false,
}

/** @deprecated Prefer EMPTY_POS_PERMS or role defaults — kept for form seeds. */
export const DEFAULT_POS_PERMS: PosStaffPermissions = {
  posTerminal: true,
  orders: true,
  menu: false,
  expenses: false,
}

export type StaffNavKey = keyof PosStaffPermissions

/** Admin toggle → route staff may open. */
export const STAFF_PERM_ROUTES: {
  key: StaffNavKey
  label: string
  path: string
  search?: string
}[] = [
  { key: 'posTerminal', label: 'POS', path: '/pos' },
  { key: 'orders', label: 'Orders', path: '/orders' },
  { key: 'menu', label: 'Menu', path: '/menu' },
  { key: 'expenses', label: 'Finance', path: '/dashboard', search: '?tab=finance' },
]

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, '')
}

export function phonesMatch(a: string, b: string) {
  const da = phoneDigits(a)
  const db = phoneDigits(b)
  if (!da || !db) return false
  if (da === db) return true
  if (da.length >= 10 && db.length >= 10) return da.slice(-10) === db.slice(-10)
  return false
}

export function resolvePosPermissions(employee: Employee): PosStaffPermissions {
  return { ...EMPTY_POS_PERMS, ...employee.posPermissions }
}

export function staffHasAnyAccess(perms: PosStaffPermissions): boolean {
  return STAFF_PERM_ROUTES.some((r) => perms[r.key])
}

export function staffLandingPath(perms: PosStaffPermissions): string {
  for (const route of STAFF_PERM_ROUTES) {
    if (perms[route.key]) {
      return route.search ? `${route.path}${route.search}` : route.path
    }
  }
  return '/staff-access'
}

export function staffNavItems(perms: PosStaffPermissions) {
  return STAFF_PERM_ROUTES.filter((r) => perms[r.key]).map((r) => ({
    to: r.search ? `${r.path}${r.search}` : r.path,
    path: r.path,
    search: r.search,
    label: r.label,
    key: r.key,
  }))
}

/** Whether a staff session may view this location. */
export function staffCanAccessLocation(
  pathname: string,
  search: string,
  perms: PosStaffPermissions,
): boolean {
  if (pathname === '/staff-access') return true

  if (pathname === '/dashboard' || pathname === '/finance') {
    if (!perms.expenses) return false
    const tab = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('tab')
    if (pathname === '/finance') return true
    return tab === 'finance'
  }

  if (pathname === '/pos' || pathname.startsWith('/pos/')) return perms.posTerminal
  if (pathname === '/orders' || pathname.startsWith('/orders/')) return perms.orders
  // Categories + Appearance are owner-only — staff menu grant = Items only.
  if (pathname === '/menu/categories' || pathname.startsWith('/menu/categories/')) return false
  if (pathname === '/menu/appearance' || pathname.startsWith('/menu/appearance/')) return false
  if (pathname === '/menu' || pathname.startsWith('/menu/')) return perms.menu

  return false
}

export function findStaffByLogin(
  phone: string,
  pin: string,
  employees: Employee[],
): Employee | null {
  const trimmedPin = pin.trim()
  if (!/^\d{4,6}$/.test(trimmedPin)) return null
  const match = employees.find(
    (e) =>
      e.posAccess &&
      e.pin === trimmedPin &&
      e.status !== 'inactive' &&
      phonesMatch(e.phone, phone),
  )
  return match ?? null
}

export function isPinTaken(
  pin: string,
  employees: Employee[],
  exceptEmployeeId?: string,
): boolean {
  return employees.some(
    (e) =>
      e.pin === pin &&
      e.status !== 'inactive' &&
      e.posAccess &&
      e.id !== exceptEmployeeId,
  )
}
