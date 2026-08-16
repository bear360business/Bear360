import type { AuthSessionResponse } from '@bear360/shared'
import { apiRequest, clearTokens, setTokens } from '@/lib/api-client'
import type { AuthRole, AuthSession } from '@/lib/auth'
import { setSession } from '@/lib/auth'
import { setCurrentRestaurantId } from '@/lib/mock/restaurants'

function applySession(res: AuthSessionResponse): AuthSession {
  setTokens(res.tokens.accessToken, res.tokens.refreshToken)
  const session = toSession(res)
  // Venue before AUTH_EVENT so hydrate effects resolve the correct restaurantId.
  if (session.restaurantId) setCurrentRestaurantId(session.restaurantId)
  setSession(session)
  return session
}

export async function apiLoginPassword(
  email: string,
  password: string,
  expectedRole?: AuthRole,
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<AuthSessionResponse>('/auth/login', {
      auth: false,
      body: { email, password, expectedRole },
    })
    return { ok: true, session: applySession(res) }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Login failed',
    }
  }
}

export async function apiLoginStaffPin(input: {
  restaurantId: string
  phone: string
  pin: string
}): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<AuthSessionResponse>('/auth/staff-login', {
      auth: false,
      body: input,
    })
    return { ok: true, session: applySession(res) }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Staff login failed',
    }
  }
}

export async function apiRequestOtp(email: string, purpose: 'signup' | 'forgot') {
  return apiRequest<{ ok: true; demoCode?: string }>('/auth/otp/request', {
    auth: false,
    body: { email, purpose },
  })
}

export async function apiVerifyOtp(
  email: string,
  purpose: 'signup' | 'forgot',
  code: string,
) {
  return apiRequest<{ ok: true; verificationToken: string }>('/auth/otp/verify', {
    auth: false,
    body: { email, purpose, code },
  })
}

export async function apiRegister(
  email: string,
  password: string,
  verificationToken: string,
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  try {
    const res = await apiRequest<AuthSessionResponse>('/auth/register', {
      auth: false,
      body: { email, password, verificationToken },
    })
    return { ok: true, session: applySession(res) }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Register failed',
    }
  }
}

export async function apiResetPassword(
  email: string,
  password: string,
  verificationToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest('/auth/password/reset', {
      auth: false,
      body: { email, password, verificationToken },
    })
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Reset failed',
    }
  }
}

export async function apiLogout() {
  const { getRefreshToken } = await import('@/lib/api-client')
  const refresh = getRefreshToken()
  if (refresh) {
    try {
      await apiRequest('/auth/logout', { auth: false, body: { refreshToken: refresh } })
    } catch {
      /* ignore */
    }
  }
  clearTokens()
}

/** Re-issue tokens so restaurantIds match DB memberships (e.g. after create store). */
export async function apiRefreshSession(): Promise<AuthSession | null> {
  const { getRefreshToken } = await import('@/lib/api-client')
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await apiRequest<AuthSessionResponse>('/auth/refresh', {
      auth: false,
      body: { refreshToken },
    })
    return applySession(res)
  } catch {
    return null
  }
}

function toSession(res: AuthSessionResponse): AuthSession {
  return {
    email: res.user.email ?? res.user.staffName ?? res.user.id,
    role: res.user.role,
    restaurantId: res.user.restaurantIds[0],
    restaurantIds: res.user.restaurantIds,
    employeeId: res.user.employeeId,
    staffName: res.user.staffName,
    posPermissions: res.user.posPermissions,
  }
}
