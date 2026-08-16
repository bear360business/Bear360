import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AUTH_EVENT,
  bindAccountRestaurant,
  clearSession,
  getSession,
  type AuthRole,
  type AuthSession,
} from '@/lib/auth'
import {
  apiLoginPassword,
  apiLoginStaffPin,
  apiLogout,
  apiRefreshSession,
  apiRegister,
} from '@/lib/api-auth'
import { clearTokens } from '@/lib/api-client'
import { setCurrentRestaurantId } from '@/lib/mock/restaurants'
import type { PosStaffPermissions } from '@/lib/types'

interface AuthContextValue {
  session: AuthSession | null
  isAuthenticated: boolean
  login: (
    email: string,
    password: string,
    expectedRole?: AuthRole,
  ) => Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }>
  loginStaff: (input: {
    phone: string
    employeeId: string
    staffName: string
    restaurantId: string
    posPermissions: PosStaffPermissions
    pin?: string
  }) => Promise<AuthSession>
  logout: () => void
  register: (
    email: string,
    password: string,
    verificationToken?: string,
  ) => Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }>
  bindRestaurant: (restaurantId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() => getSession())

  useEffect(() => {
    const sync = () => setSessionState(getSession())
    window.addEventListener(AUTH_EVENT, sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'bearqr:session' || e.key === null) sync()
    })
    return () => window.removeEventListener(AUTH_EVENT, sync)
  }, [])

  const login = useCallback(
    async (email: string, password: string, expectedRole?: AuthRole) => {
      const result = await apiLoginPassword(email, password, expectedRole)
      if (!result.ok) return result
      if (result.session.restaurantId) setCurrentRestaurantId(result.session.restaurantId)
      setSessionState(result.session)
      return result
    },
    [],
  )

  const loginStaff = useCallback(
    async (input: {
      phone: string
      employeeId: string
      staffName: string
      restaurantId: string
      posPermissions: PosStaffPermissions
      pin?: string
    }) => {
      if (!input.pin) throw new Error('PIN required for staff login')
      const result = await apiLoginStaffPin({
        restaurantId: input.restaurantId,
        phone: input.phone,
        pin: input.pin,
      })
      if (!result.ok) throw new Error(result.error)
      setCurrentRestaurantId(input.restaurantId)
      setSessionState(result.session)
      return result.session
    },
    [],
  )

  const logout = useCallback(() => {
    void apiLogout()
    clearSession()
    clearTokens()
    try {
      sessionStorage.removeItem('bearqr:pos-session')
    } catch {
      /* ignore */
    }
    setSessionState(null)
  }, [])

  const register = useCallback(
    async (email: string, password: string, verificationToken?: string) => {
      if (!verificationToken) {
        return { ok: false as const, error: 'Verify OTP before creating your account' }
      }
      const result = await apiRegister(email, password, verificationToken)
      if (result.ok) setSessionState(result.session)
      return result
    },
    [],
  )

  const bindRestaurant = useCallback((restaurantId: string) => {
    const s = getSession()
    if (!s) return
    bindAccountRestaurant(s.email, restaurantId)
    setCurrentRestaurantId(restaurantId)
    setSessionState(getSession())
    void apiRefreshSession().then((session) => {
      if (!session) return
      const restaurantIds = [...new Set([...(session.restaurantIds ?? []), restaurantId])]
      const next = {
        ...session,
        restaurantId,
        restaurantIds,
      }
      bindAccountRestaurant(next.email, restaurantId)
      setCurrentRestaurantId(restaurantId)
      setSessionState(next)
      try {
        window.dispatchEvent(new Event('bearqr:auth-changed'))
      } catch {
        /* ignore */
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: !!session,
      login,
      loginStaff,
      logout,
      register,
      bindRestaurant,
    }),
    [session, login, loginStaff, logout, register, bindRestaurant],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

/** Imperative clear for layouts that may run outside React tree edges. */
export function clearAuthSession() {
  clearSession()
  clearTokens()
}
