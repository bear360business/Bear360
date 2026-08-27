import { apiBaseUrl } from '@/lib/runtime-config'

const ACCESS_KEY = 'bearqr:api-access-token'
const REFRESH_KEY = 'bearqr:api-refresh-token'

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY)
  } catch {
    return null
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function setTokens(accessToken: string, refreshToken: string) {
  try {
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
  } catch {
    /* ignore */
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    /* ignore */
  }
}

export class ApiClientError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

type RequestOpts = {
  method?: string
  body?: unknown
  auth?: boolean
  restaurantId?: string
  /** Internal: skip refresh retry. */
  _retry?: boolean
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = (await res.json()) as {
      tokens?: { accessToken: string; refreshToken: string }
    }
    if (!data.tokens?.accessToken || !data.tokens.refreshToken) return false
    setTokens(data.tokens.accessToken, data.tokens.refreshToken)
    return true
  } catch {
    return false
  }
}

export async function apiRequest<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (opts.auth !== false) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  if (opts.restaurantId) headers['X-Restaurant-Id'] = opts.restaurantId

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (res.status === 401 && opts.auth !== false && !opts._retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiRequest<T>(path, { ...opts, _retry: true })
    }
    try {
      localStorage.removeItem('bearqr:session')
    } catch {}
    clearTokens()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bearqr:auth-changed'))
    }
  } else if (res.status === 401 && opts.auth !== false && opts._retry) {
    try {
      localStorage.removeItem('bearqr:session')
    } catch {}
    clearTokens()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bearqr:auth-changed'))
    }
  }

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const err = data as { code?: string; message?: string; details?: unknown } | null
    throw new ApiClientError(
      res.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? res.statusText,
      err?.details,
    )
  }

  return data as T
}
