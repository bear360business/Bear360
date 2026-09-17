import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuthPrimaryButton, AuthSplitShell, AUTH_ACCENT } from '@/features/admin/signup/AuthSplitShell'
import { apiRequestOtp, apiVerifyOtp } from '@/lib/api-auth'
import { useMockData } from '@/lib/runtime-config'
import { cn } from '@/lib/utils'
import { FORGOT_OTP, readForgotDraft, writeForgotDraft } from './forgot-draft'
import { reportApiError } from '@/lib/api-error'

const LENGTH = 4

/** Step 2 — verify demo OTP before resetting password. */
export function ForgotOtpPage() {
  const navigate = useNavigate()
  const mock = useMockData()
  const draft = readForgotDraft()
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

  if (!draft) return <Navigate to="/forgot-password" replace />

  const code = digits.join('')

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
    if (submitting) return
    if (code.length !== LENGTH) {
      setError('Enter the 4-digit code')
      return
    }
    setSubmitting(true)
    if (!mock) {
      try {
        const res = await apiVerifyOtp(draft.email, 'forgot', code)
        writeForgotDraft({
          ...draft,
          otpVerified: true,
          verificationToken: res.verificationToken,
        })
        navigate('/forgot-password/reset')
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
    if (code !== FORGOT_OTP) {
      setSubmitting(false)
      setError('Invalid code')
      return
    }
    writeForgotDraft({ ...draft, otpVerified: true })
    navigate('/forgot-password/reset')
  }

  const onResend = () => {
    if (resendIn > 0) return
    setResendIn(60)
    setDigits(Array(LENGTH).fill(''))
    setError('')
    inputs.current[0]?.focus()
    if (!mock) {
      void apiRequestOtp(draft.email, 'forgot')
        .then(() => {
          toast.message('Code resent', {
            description: 'Check your email for a new code.',
          })
        })
        .catch((err) => reportApiError(err))
      return
    }
    toast.message('Code resent', { description: 'Check your email for a new code.' })
  }

  return (
    <AuthSplitShell variant="otp">
      <h2 className="font-marketing text-2xl font-extrabold tracking-tight text-[#1A1D26]">
        Verify reset code
      </h2>
      <p className="mt-2 text-sm text-[#8B93A7]">
        Enter the 4-digit code for{' '}
        <span className="font-medium text-[#5C6478]">{draft.email}</span>
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="flex justify-center gap-2" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el
              }}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className={cn(
                'h-14 w-14 rounded-xl border bg-white text-center font-marketing text-xl font-bold text-[#1A1D26] outline-none transition-shadow',
                error ? 'border-red-400' : 'border-[#D8DEE9] focus:border-[#8DA9FF] focus:ring-2 focus:ring-[#8DA9FF]/25',
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
            'Verify & continue'
          )}
        </AuthPrimaryButton>
      </form>

      <p className="mt-4 text-center text-sm text-[#8B93A7]">
        {resendIn > 0 ? (
          <>Resend in {resendIn}s</>
        ) : (
          <button type="button" className="font-semibold text-[#5C6478] hover:text-[#1A1D26]" onClick={onResend}>
            Resend code
          </button>
        )}
      </p>

      <p className="mt-6 text-center text-sm text-[#5C6478]">
        <Link to="/forgot-password" className="font-semibold" style={{ color: AUTH_ACCENT }}>
          ← Change email
        </Link>
      </p>
    </AuthSplitShell>
  )
}
