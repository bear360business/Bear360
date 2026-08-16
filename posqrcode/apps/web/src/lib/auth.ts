/** Demo auth — localStorage accounts + session. OTP/password are UI-only. */

import type { PosStaffPermissions } from '@/lib/types'

export type AuthRole = 'restaurant' | 'super' | 'kitchen' | 'staff'

export type AuthAccount = {
  email: string
  password: string
  role: AuthRole
  /** Primary / last-active venue for restaurant / kitchen logins. */
  restaurantId?: string
  /** All venues this account may open (multi-store owners). */
  restaurantIds?: string[]
}

export type AuthSession = {
  email: string
  role: AuthRole
  restaurantId?: string
  restaurantIds?: string[]
  /** Staff PIN login identity (role === 'staff'). */
  employeeId?: string
  staffName?: string
  posPermissions?: PosStaffPermissions
}

const ACCOUNTS_KEY = 'bearqr:accounts'
const SESSION_KEY = 'bearqr:session'
export const AUTH_EVENT = 'bearqr:auth-changed'

function notify() {
  try {
    window.dispatchEvent(new Event(AUTH_EVENT))
  } catch {
    /* ignore */
  }
}

function readAccounts(): AuthAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AuthAccount[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAccounts(list: AuthAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function upsertAccount(account: AuthAccount) {
  const list = readAccounts()
  const email = account.email.trim().toLowerCase()
  const next: AuthAccount = { ...account, email }
  const idx = list.findIndex((a) => a.email.toLowerCase() === email)
  if (idx >= 0) list[idx] = { ...list[idx], ...next }
  else list.push(next)
  writeAccounts(list)
}

export function getAccount(email: string): AuthAccount | undefined {
  const key = email.trim().toLowerCase()
  return readAccounts().find((a) => a.email.toLowerCase() === key)
}

export function verifyPassword(email: string, password: string): AuthAccount | null {
  const account = getAccount(email)
  if (!account) return null
  if (account.password !== password) return null
  return account
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as AuthSession
    if (!s?.email || !s?.role) return null
    return s
  } catch {
    return null
  }
}

export function isSuperAdmin(session?: AuthSession | null): boolean {
  return (session ?? getSession())?.role === 'super'
}

export function setSession(session: AuthSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
  notify()
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  notify()
}

export function loginWithPassword(
  email: string,
  password: string,
  expectedRole?: AuthRole,
): { ok: true; session: AuthSession } | { ok: false; error: string } {
  const account = verifyPassword(email, password)
  if (!account) {
    // Unknown email: allow demo-style login only for seeded emails with wrong hint.
    if (!getAccount(email)) {
      return { ok: false, error: 'No account for this email. Sign up first, or use the demo login.' }
    }
    return { ok: false, error: 'Incorrect password.' }
  }
  if (expectedRole && account.role !== expectedRole) {
    return { ok: false, error: `This account is for ${account.role}, not ${expectedRole}.` }
  }
  const restaurantIds = normalizeVenueIds(account)
  const session: AuthSession = {
    email: account.email,
    role: account.role,
    ...(account.restaurantId ? { restaurantId: account.restaurantId } : {}),
    ...(restaurantIds.length ? { restaurantIds } : {}),
  }
  setSession(session)
  return { ok: true, session }
}

function normalizeVenueIds(account: AuthAccount): string[] {
  const ids = new Set<string>()
  if (account.restaurantId) ids.add(account.restaurantId)
  for (const id of account.restaurantIds ?? []) {
    if (id) ids.add(id)
  }
  return [...ids]
}

/** Venue ids this restaurant account may switch between. */
export function getAccountVenueIds(email: string): string[] {
  const account = getAccount(email)
  return account ? normalizeVenueIds(account) : []
}

export function logout() {
  clearSession()
}

/** Staff portal session from mobile + PIN (see Staff → POS Staff). */
export function loginWithStaffPin(input: {
  phone: string
  employeeId: string
  staffName: string
  restaurantId: string
  posPermissions: PosStaffPermissions
}): AuthSession {
  const session: AuthSession = {
    email: `staff:${input.employeeId}`,
    role: 'staff',
    restaurantId: input.restaurantId,
    restaurantIds: [input.restaurantId],
    employeeId: input.employeeId,
    staffName: input.staffName,
    posPermissions: input.posPermissions,
  }
  setSession(session)
  return session
}

/** Register after signup password step. */
export function registerRestaurantAccount(email: string, password: string) {
  upsertAccount({
    email,
    password,
    role: 'restaurant',
  })
  setSession({ email: email.trim().toLowerCase(), role: 'restaurant' })
}

/** Demo default password for Super-provisioned owners. */
export const DEMO_OWNER_PASSWORD = 'demo1234'

/**
 * Create or update a restaurant owner login for a venue (Super create-store).
 * Does not change the current Super session.
 */
export function provisionRestaurantOwner(
  email: string,
  restaurantId: string,
  password = DEMO_OWNER_PASSWORD,
): { ok: true; created: boolean; password: string } | { ok: false; error: string } {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed.includes('@')) {
    return { ok: false, error: 'Invalid owner email' }
  }
  const existing = getAccount(trimmed)
  if (existing && existing.role !== 'restaurant') {
    return { ok: false, error: `Email is already a ${existing.role} account` }
  }
  const restaurantIds = [
    ...new Set([...(existing ? normalizeVenueIds(existing) : []), restaurantId]),
  ]
  upsertAccount({
    email: trimmed,
    password: existing?.password || password,
    role: 'restaurant',
    restaurantId,
    restaurantIds,
  })
  return {
    ok: true,
    created: !existing,
    password: existing?.password || password,
  }
}

export function bindAccountRestaurant(email: string, restaurantId: string) {
  const account = getAccount(email)
  if (!account) return
  const restaurantIds = [...new Set([...normalizeVenueIds(account), restaurantId])]
  upsertAccount({ ...account, restaurantId, restaurantIds })
  const session = getSession()
  if (session && session.email.toLowerCase() === email.toLowerCase()) {
    setSession({ ...session, restaurantId, restaurantIds })
  }
}

/** Demo password reset after OTP — updates stored account password. */
export function resetAccountPassword(
  email: string,
  password: string,
): { ok: true } | { ok: false; error: string } {
  const account = getAccount(email)
  if (!account) {
    return { ok: false, error: 'No account found for this email.' }
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }
  upsertAccount({ ...account, password })
  return { ok: true }
}
