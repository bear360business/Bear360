import { getRole } from '@/lib/mock/staff'
import type {
  Employee,
  PermissionGrant,
  PosStaffPermissions,
  StaffRoleId,
} from '@/lib/types'
import { resolvePosPermissions } from '@/lib/staff-access'

function isGranted(grant: PermissionGrant): boolean {
  return grant === true || (typeof grant === 'object' && grant.maxPct > 0)
}

function maxPct(grant: PermissionGrant): number {
  if (typeof grant === 'object' && grant && 'maxPct' in grant) return grant.maxPct
  if (grant === true) return 100
  return 0
}

/** Default module toggles when enabling POS login for a role. */
export function defaultPosPermissionsForRole(roleId: StaffRoleId): PosStaffPermissions {
  if (roleId === 'master' || roleId === 'manager') {
    return { posTerminal: true, orders: true, menu: true, expenses: true }
  }
  if (roleId === 'cashier') {
    return { posTerminal: true, orders: true, menu: false, expenses: true }
  }
  if (roleId === 'waiter') {
    return { posTerminal: true, orders: true, menu: false, expenses: false }
  }
  if (roleId === 'kitchen') {
    return { posTerminal: false, orders: true, menu: false, expenses: false }
  }
  // Custom roles — match Master-style access by default.
  return { posTerminal: true, orders: true, menu: true, expenses: true }
}

function isLeadershipRole(roleId: StaffRoleId, grant: ReturnType<typeof getRole>['permissions']) {
  if (roleId === 'master' || roleId === 'manager') return true
  // Custom roles cloned from Master/Manager get the same leadership powers.
  return (
    grant.voidBill === true &&
    grant.manageInventory === true &&
    grant.acceptPayment === true &&
    grant.viewReports === true
  )
}

export type StaffCapabilities = {
  modules: PosStaffPermissions
  takeOrders: boolean
  acceptPayment: boolean
  applyDiscount: boolean
  maxDiscountPct: number
  voidBill: boolean
  viewReports: boolean
  manageInventory: boolean
  /** Menu module + manager role → edit; others view-only. */
  editMenu: boolean
  /** Expenses module: only managers may add income. */
  addIncome: boolean
}

/** Merge Roles matrix + POS Staff module toggles for runtime checks. */
export function resolveStaffCapabilities(employee: Employee): StaffCapabilities {
  const role = getRole(employee.roleId)
  const p = role.permissions
  const modules = resolvePosPermissions(employee)
  const applyDiscount = isGranted(p.applyDiscount)

  return {
    modules,
    takeOrders: isGranted(p.takeOrders),
    acceptPayment: isGranted(p.acceptPayment),
    applyDiscount,
    maxDiscountPct: applyDiscount ? maxPct(p.applyDiscount) : 0,
    voidBill: isGranted(p.voidBill),
    viewReports: isGranted(p.viewReports),
    manageInventory: isGranted(p.manageInventory),
    editMenu: modules.menu && isLeadershipRole(employee.roleId, p),
    addIncome: modules.expenses && isLeadershipRole(employee.roleId, p),
  }
}
