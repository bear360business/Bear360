import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData } from '@/lib/api-platform'
import {
  createStaffRole,
  isBuiltinRole,
  readStaffRoles,
  removeStaffRole,
  STAFF_ROLES_EVENT,
  writeStaffRoles,
} from '@/lib/staff-roles-store'
import { useMockData } from '@/lib/runtime-config'
import type { StaffRole, StaffRoleId } from '@/lib/types'
import {
  resolveDataVenueId,
  subscribeVenueScope,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

interface StaffRolesContextValue {
  roles: StaffRole[]
  setRoles: (roles: StaffRole[]) => void
  /** Persist current roles list. */
  saveRoles: (roles: StaffRole[]) => void
  /** Create a custom role (defaults permissions from template, usually Master). */
  addRole: (
    name: string,
    templateId?: StaffRoleId,
  ) => { ok: true; role: StaffRole } | { ok: false; error: string }
  /** Remove a custom role (built-ins blocked). Caller should reassign employees first. */
  removeRole: (roleId: StaffRoleId) => { ok: true } | { ok: false; error: string }
  isBuiltinRole: (roleId: StaffRoleId) => boolean
}

const StaffRolesContext = createContext<StaffRolesContextValue | null>(null)

export function StaffRolesProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [roles, setRolesState] = useState<StaffRole[]>(() => readStaffRoles())

  useEffect(() => subscribeVenueScope(() => setVenueId(resolveDataVenueId())), [])

  useEffect(() => {
    const sync = () => setRolesState(readStaffRoles())
    window.addEventListener(STAFF_ROLES_EVENT, sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'bearqr:staff-roles' || e.key === null) sync()
    })
    return () => window.removeEventListener(STAFF_ROLES_EVENT, sync)
  }, [])

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void apiGetVenueData<StaffRole[]>(venueId, 'staffRoles')
      .then((rows) => {
        if (cancelled) return
        if (!Array.isArray(rows) || rows.length === 0) return
        try {
          localStorage.setItem('bearqr:staff-roles', JSON.stringify(rows))
        } catch {
          /* ignore */
        }
        setRolesState(rows.map((r) => ({ ...r, permissions: { ...r.permissions } })))
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  const setRoles = useCallback((next: StaffRole[]) => {
    setRolesState(next.map((r) => ({ ...r, permissions: { ...r.permissions } })))
  }, [])

  const saveRoles = useCallback((next: StaffRole[]) => {
    writeStaffRoles(next)
    setRolesState(next.map((r) => ({ ...r, permissions: { ...r.permissions } })))
  }, [])

  const addRole = useCallback((name: string, templateId: StaffRoleId = 'master') => {
    const result = createStaffRole(name, templateId)
    if (!result.ok) return { ok: false as const, error: result.error }
    setRolesState(result.roles)
    return { ok: true as const, role: result.role }
  }, [])

  const removeRole = useCallback((roleId: StaffRoleId) => {
    const result = removeStaffRole(roleId, readStaffRoles())
    if (!result.ok) return { ok: false as const, error: result.error }
    setRolesState(result.roles)
    return { ok: true as const }
  }, [])

  const value = useMemo(
    () => ({ roles, setRoles, saveRoles, addRole, removeRole, isBuiltinRole }),
    [roles, setRoles, saveRoles, addRole, removeRole],
  )

  return <StaffRolesContext.Provider value={value}>{children}</StaffRolesContext.Provider>
}

export function useStaffRoles(): StaffRolesContextValue {
  const ctx = useContext(StaffRolesContext)
  if (!ctx) throw new Error('useStaffRoles must be used within <StaffRolesProvider>')
  return ctx
}
