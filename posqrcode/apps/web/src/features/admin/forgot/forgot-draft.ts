/** Demo forgot-password draft (session). OTP matches signup: 1234. */

export const FORGOT_OTP = '1234'

const KEY = 'bearqr:forgot-draft'

export type ForgotDraft = {
  email: string
  otpVerified: boolean
  verificationToken?: string
  /** Present when API falls back to demo OTP (SMTP off). */
  demoCode?: string
  /** Where to send the user after a successful reset. */
  returnTo?: string
}

export function readForgotDraft(): ForgotDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ForgotDraft
    if (!parsed?.email) return null
    return {
      email: parsed.email,
      otpVerified: !!parsed.otpVerified,
      verificationToken:
        typeof parsed.verificationToken === 'string' ? parsed.verificationToken : undefined,
      demoCode: typeof parsed.demoCode === 'string' ? parsed.demoCode : undefined,
      returnTo: typeof parsed.returnTo === 'string' ? parsed.returnTo : undefined,
    }
  } catch {
    return null
  }
}

export function writeForgotDraft(draft: ForgotDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function clearForgotDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function loginPathForEmail(email: string, returnTo?: string): string {
  if (returnTo === '/super/login' || returnTo?.startsWith('/super')) return '/super/login'
  try {
    const raw = localStorage.getItem('bearqr:accounts')
    if (raw) {
      const accounts = JSON.parse(raw) as Array<{ email?: string; role?: string }>
      const hit = accounts.find((a) => a.email?.toLowerCase() === email.trim().toLowerCase())
      if (hit?.role === 'super') return '/super/login'
    }
  } catch {
    /* ignore */
  }
  return '/login'
}
