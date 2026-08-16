import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useStaff } from '@/hooks/use-staff'
import {
  EMPTY_POS_PERMS,
  resolvePosPermissions,
  staffCanAccessLocation,
  staffHasAnyAccess,
  staffLandingPath,
} from '@/lib/staff-access'

/** Restricts restaurant shell routes for PIN staff sessions. */
export function StaffRouteGuard() {
  const { session } = useAuth()
  const { employees } = useStaff()
  const location = useLocation()

  if (!session || session.role !== 'staff') {
    return <Outlet />
  }

  const emp = employees.find((e) => e.id === session.employeeId)
  const perms = emp
    ? resolvePosPermissions(emp)
    : (session.posPermissions ?? EMPTY_POS_PERMS)

  if (!staffHasAnyAccess(perms)) {
    if (location.pathname !== '/staff-access') {
      return <Navigate to="/staff-access" replace />
    }
    return <Outlet />
  }

  if (!staffCanAccessLocation(location.pathname, location.search, perms)) {
    return <Navigate to={staffLandingPath(perms)} replace />
  }

  return <Outlet />
}
