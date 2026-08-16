import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import type { AuthRole } from '@/lib/auth'
import { EMPTY_POS_PERMS, staffLandingPath } from '@/lib/staff-access'

/** Gate admin / kitchen / super shells behind a demo session. */
export function RequireAuth({
  role,
  children,
}: {
  role: AuthRole | AuthRole[]
  children: React.ReactNode
}) {
  const { session } = useAuth()
  const location = useLocation()
  const allowed = Array.isArray(role) ? role : [role]

  if (!session) {
    const login =
      allowed.includes('super') && !allowed.includes('restaurant') && !allowed.includes('staff')
        ? '/super/login'
        : allowed.includes('staff') && !allowed.includes('restaurant')
          ? '/staff-login'
          : '/login'
    return <Navigate to={login} replace state={{ from: location.pathname }} />
  }

  if (!allowed.includes(session.role)) {
    if (session.role === 'super') return <Navigate to="/super/dashboard" replace />
    if (session.role === 'kitchen') return <Navigate to="/kitchen" replace />
    if (session.role === 'staff') {
      return (
        <Navigate
          to={staffLandingPath(session.posPermissions ?? EMPTY_POS_PERMS)}
          replace
        />
      )
    }
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
