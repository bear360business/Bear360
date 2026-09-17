import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { apiRequestOtp, apiVerifyOtp } from '@/lib/api-auth'
import { useMockData } from '@/lib/runtime-config'
import { AuthPrimaryButton, AuthSplitShell, AUTH_ACCENT } from './AuthSplitShell'
import {
  DEMO_OTP,
  readSignupDraft,
  writeSignupDraft,
} from './signup-draft'
import { cn } from '@/lib/utils'
import { reportApiError } from '@/lib/api-error'

const LENGTH = 4

/** Step 2 — 4-digit email OTP (demo code 1234). */
export function OtpVerifyPage() {
  const navigate = useNavigate()
  const mock = useMockData()
  const draft = readSignupDraft()
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(60)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000)
    return () => window.clearTimeout(t)
  }, [resendIn])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  const code = digits.join('')

  if (!draft) {
    return <Navigate to="/signup" replace />
  }

  const setAt = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    setError('')
    if (char && index < LENGTH - 1) inputs.current[index + 1]?.focus()
  }

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    const next = Array(LENGTH)
      .fill('')
      .map((_, i) => pasted[i] ?? '')
    setDigits(next)
    inputs.current[Math.min(pasted.length, LENGTH) - 1]?.focus()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting || !draft) return
    if (code.length !== LENGTH) {
      setError('Enter the 4-digit code')
      return
    }
    setSubmitting(true)
    if (!mock) {
      try {
        const res = await apiVerifyOtp(draft.email, 'signup', code)
        writeSignupDraft({
          ...draft,
          otpVerified: true,
          verificationToken: res.verificationToken,
        })
        navigate('/signup/password')
      } catch (err) {
        setSubmitting(false)
        setError(
          err instanceof Error
            ? err.message
            : 'Invalid or expired code',
        )
      }
      return
    }
    if (code !== DEMO_OTP) {
      setSubmitting(false)
      setError('Invalid code')
      return
    }
    writeSignupDraft({ ...draft, otpVerified: true })
    navigate('/signup/password')
  }

  const onResend = () => {
    if (resendIn > 0) return
    setResendIn(60)
    setDigits(Array(LENGTH).fill(''))
    setError('')
    inputs.current[0]?.focus()
    if (!mock && draft) {
      void apiRequestOtp(draft.email, 'signup')
        .catch((err) => reportApiError(err))
    }
  }

  return (
    <AuthSplitShell
      variant="otp"
      legal="By signing in, you agree to our Terms of Service and Privacy Policy. Authorized access only."
    >
      <h2 className="font-marketing text-2xl font-extrabold tracking-tight text-[#1A1D26]">
        Get started with your email
      </h2>
      <p className="mt-1 text-base font-semibold text-[#1A1D26]">Verify OTP</p>
      <p className="mt-2 text-sm text-[#8B93A7]">
        We&apos;ve sent a 4-digit code to your{' '}
        <span className="font-medium text-[#5C6478]">{draft.email}</span>
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#E8F8EF] px-3 py-2.5 text-sm text-[#1B7A45]">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Verification code sent to your email.
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="flex justify-center gap-3" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              aria-label={`Digit ${i + 1}`}
              className={cn(
                'h-14 w-14 rounded-xl border bg-white text-center font-marketing text-xl font-bold text-[#1A1D26] outline-none transition-shadow',
                error
                  ? 'border-red-400'
                  : 'border-[#D8DEE9] focus:border-[#8DA9FF] focus:ring-2 focus:ring-[#8DA9FF]/30',
              )}
            />
          ))}
        </div>
        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <AuthPrimaryButton disabled={submitting || code.length !== LENGTH}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            'Verify & Continue'
          )}
        </AuthPrimaryButton>
      </form>

      <div className="mt-5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-[#8B93A7]">
        <Link to="/signup" className="hover:text-[#1A1D26]">
          Change email
        </Link>
        <button
          type="button"
          onClick={onResend}
          disabled={resendIn > 0}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
        </button>
      </div>

      <div className="mt-6 border-t border-[#EEF1F6] pt-5 text-center text-sm text-[#5C6478]">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: AUTH_ACCENT }}
        >
          Log in →
        </Link>
      </div>
    </AuthSplitShell>
  )
}
