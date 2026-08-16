import type { IndustryId } from '@/lib/types'

const KEY = 'bearqr:signup-draft'

export type SignupDraft = {
  email: string
  /** Set after OTP step succeeds. */
  otpVerified?: boolean
  /** From POST /auth/otp/verify — required for API register. */
  verificationToken?: string
  /** Present when API falls back to demo OTP (SMTP off). */
  demoCode?: string
  storeName?: string
  ownerName?: string
  phone?: string
  city?: string
  industryId?: IndustryId
}

export function readSignupDraft(): SignupDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SignupDraft
    if (!parsed?.email?.includes('@')) return null
    return parsed
  } catch {
    return null
  }
}

export function writeSignupDraft(draft: SignupDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function patchSignupDraft(patch: Partial<SignupDraft>) {
  const current = readSignupDraft()
  if (!current) return
  writeSignupDraft({ ...current, ...patch })
}

export function clearSignupDraft() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** Demo 4-digit OTP (no email backend). */
export const DEMO_OTP = '1234'

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!user || !domain) return email
  if (user.length <= 2) return `${user[0] ?? ''}••@${domain}`
  return `${user.slice(0, 2)}•••@${domain}`
}
