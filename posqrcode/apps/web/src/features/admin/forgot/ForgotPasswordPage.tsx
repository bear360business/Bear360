import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AuthPrimaryButton,
  AuthSplitShell,
  AUTH_ACCENT,
  AUTH_INPUT_CLASS,
} from '@/features/admin/signup/AuthSplitShell'
import { apiRequestOtp } from '@/lib/api-auth'
import { getAccount } from '@/lib/auth'
import { useMockData } from '@/lib/runtime-config'
import { cn } from '@/lib/utils'
import { loginPathForEmail, writeForgotDraft } from './forgot-draft'

/** Step 1 — enter account email to reset password. */
export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const mock = useMockData()
  const [params] = useSearchParams()
  const fromSuper = params.get('from') === 'super'
  const [email, setEmail] = useState(fromSuper ? 'anya@bear360.app' : 'riya@masalabear.in')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const backLogin = fromSuper ? '/super/login' : '/login'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      setError('Enter a valid email')
      return
    }
    if (mock && !getAccount(trimmed)) {
      setError('No account for this email. Sign up first, or use a demo login.')
      return
    }
    setError('')
    setSubmitting(true)
    writeForgotDraft({
      email: trimmed,
      otpVerified: false,
      returnTo: fromSuper ? '/super/login' : loginPathForEmail(trimmed),
    })
    if (!mock) {
      try {
        const res = await apiRequestOtp(trimmed, 'forgot')
        writeForgotDraft({
          email: trimmed,
          otpVerified: false,
          demoCode: res.demoCode,
          returnTo: fromSuper ? '/super/login' : loginPathForEmail(trimmed),
        })
        toast.message(res.demoCode ? 'Demo code ready' : 'Code sent', {
          description: res.demoCode
            ? `Use OTP ${res.demoCode} to continue.`
            : 'Check your email for the 4-digit code.',
        })
      } catch (err) {
        setSubmitting(false)
        setError(err instanceof Error ? err.message : 'Could not send code')
        return
      }
    } else {
      toast.message('Demo code sent', { description: 'Use OTP 1234 to continue.' })
    }
    navigate('/forgot-password/otp')
  }

  return (
    <AuthSplitShell variant="login">
      <h2 className="font-marketing text-2xl font-extrabold tracking-tight text-[#1A1D26]">
        Forgot password
      </h2>
      <p className="mt-1 text-sm text-[#8B93A7]">
        Enter your account email — we&apos;ll send a reset code.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5C6478]">
            Email address
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            className={cn(AUTH_INPUT_CLASS, 'mt-2')}
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <AuthPrimaryButton disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            'Send reset code'
          )}
        </AuthPrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#8B93A7]">
        <Link to={backLogin} className="font-semibold" style={{ color: AUTH_ACCENT }}>
          ← Back to login
        </Link>
      </p>
    </AuthSplitShell>
  )
}
