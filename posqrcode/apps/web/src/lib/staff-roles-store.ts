import { getAccessToken } from '@/lib/api-client'
import { apiPutVenueData } from '@/lib/api-platform'
import { seedStaffRoles, syncStaffRolesMock } from '@/lib/mock/staff'
import { useMockData } from '@/lib/runtime-config'
import type { PermissionGrant, PermissionKey, StaffRole, StaffRoleId } from '@/lib/types'
import { resolveDataVenueId } from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'

export const STAFF_ROLES_KEY = 'bearqr:staff-roles'
export const STAFF_ROLES_EVENT = 'bearqr:staff-roles-changed'

/** Built-in roles cannot be deleted. */
export const BUILTIN_ROLE_IDS = new Set(seedStaffRoles.map((r) => r.id))

export function isBuiltinRole(id: StaffRoleId) {
  return BUILTIN_ROLE_IDS.has(id)
}

const PERMISSIONS = [
  'takeOrders',
  'acceptPayment',
  'applyDiscount',
  'voidBill',
  'viewReports',
  'manageInventory',
] as const satisfies PermissionKey[]

const ROLE_COLORS = [
  { colorClass: 'text-brand', bgClass: 'bg-brand-tint' },
  { colorClass: 'text-info', bgClass: 'bg-info-tint' },
  { colorClass: 'text-success', bgClass: 'bg-success-tint' },
  { colorClass: 'text-warning', bgClass: 'bg-warning-tint' },
  { colorClass: 'text-foreground', bgClass: 'bg-surface-muted' },
]

function notify() {
  try {
    window.dispatchEvent(new Event(STAFF_ROLES_EVENT))
  } catch {
    /* ignore */
  }
}

export function slugRoleId(name: string): StaffRoleId {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return (base || `role-${Date.now().toString(36)}`) as StaffRoleId
}

export function readStaffRoles(): StaffRole[] {
  try {
    const raw = localStorage.getItem(STAFF_ROLES_KEY)
    if (!raw) {
      const seeded = seedStaffRoles.map((r) => ({ ...r, permissions: { ...r.permissions } }))
      syncStaffRolesMock(seeded)
      return seeded
    }
    const parsed = JSON.parse(raw) as StaffRole[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = seedStaffRoles.map((r) => ({ ...r, permissions: { ...r.permissions } }))
      syncStaffRolesMock(seeded)
      return seeded
    }
    const byId = new Map(parsed.map((r) => [r.id, { ...r, permissions: { ...r.permissions } }]))
    for (const seed of seedStaffRoles) {
      if (!byId.has(seed.id)) {
        byId.set(seed.id, { ...seed, permissions: { ...seed.permissions } })
      }
    }
    const order = seedStaffRoles.map((r) => r.id)
    const merged = [
      ...order.map((id) => byId.get(id)!).filter(Boolean),
      ...[...byId.values()].filter((r) => !order.includes(r.id)),
    ]
    syncStaffRolesMock(merged)
    return merged
  } catch {
    const seeded = seedStaffRoles.map((r) => ({ ...r, permissions: { ...r.permissions } }))
    syncStaffRolesMock(seeded)
    return seeded
  }
}

export function writeStaffRoles(roles: StaffRole[]) {
  try {
    localStorage.setItem(STAFF_ROLES_KEY, JSON.stringify(roles))
  } catch {
    /* ignore */
  }
  syncStaffRolesMock(roles)
  notify()
  if (!useMockData() && getAccessToken()) {
    void apiPutVenueData(resolveDataVenueId(), 'staffRoles', roles).catch((err) => reportApiError(err))
  }
}

export function createStaffRole(
  name: string,
  templateId: StaffRoleId = 'master',
  existing: StaffRole[] = readStaffRoles(),
): { ok: true; role: StaffRole; roles: StaffRole[] } | { ok: false; error: string } {
  const trimmed = name.trim()
  if (trimmed.length < 2) {
    return { ok: false, error: 'Role name needs at least 2 characters' }
  }
  if (existing.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: 'A role with this name already exists' }
  }

  let id = slugRoleId(trimmed)
  if (existing.some((r) => r.id === id)) {
    id = `${id}-${Date.now().toString(36)}` as StaffRoleId
  }

  const template =
    existing.find((r) => r.id === templateId) ??
    existing.find((r) => r.id === 'master') ??
    existing.find((r) => r.id === 'manager') ??
    existing[0]!

  const tint = ROLE_COLORS[existing.length % ROLE_COLORS.length]!
  const permissions = { ...template.permissions } as Record<PermissionKey, PermissionGrant>
  for (const key of PERMISSIONS) {
    if (permissions[key] === undefined) permissions[key] = false
  }

  const role: StaffRole = {
    id,
    name: trimmed,
    colorClass: tint.colorClass,
    bgClass: tint.bgClass,
    permissions,
  }
  const roles = [...existing, role]
  writeStaffRoles(roles)
  return { ok: true, role, roles }
}

export function removeStaffRole(
  roleId: StaffRoleId,
  existing: StaffRole[] = readStaffRoles(),
): { ok: true; roles: StaffRole[] } | { ok: false; error: string } {
  if (isBuiltinRole(roleId)) {
    return { ok: false, error: 'Built-in roles can’t be removed' }
  }
  if (!existing.some((r) => r.id === roleId)) {
    return { ok: false, error: 'Role not found' }
  }
  const roles = existing.filter((r) => r.id !== roleId)
  writeStaffRoles(roles)
  return { ok: true, roles }
}
