import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BRAND_NAME } from '@/lib/brand'
import { apiRequestOtp } from '@/lib/api-auth'
import { useMockData } from '@/lib/runtime-config'
import { AuthPrimaryButton, AuthSplitShell, AUTH_ACCENT, AUTH_INPUT_CLASS } from './AuthSplitShell'
import { readSignupDraft, writeSignupDraft } from './signup-draft'

/** Step 1 — email only → request 4-digit secure code (Huno-style). */
export function SignupEmailPage() {
  const navigate = useNavigate()
  const mock = useMockData()
  const existing = readSignupDraft()
  const [email, setEmail] = useState(existing?.email ?? '')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) return
    setSubmitting(true)
    writeSignupDraft({ email: trimmed, otpVerified: false })
    if (!mock) {
      try {
        const res = await apiRequestOtp(trimmed, 'signup')
        writeSignupDraft({
          email: trimmed,
          otpVerified: false,
          demoCode: res.demoCode,
        })
        toast.message(res.demoCode ? 'Demo code ready' : 'Code sent', {
          description: res.demoCode
            ? `Use OTP ${res.demoCode} to continue.`
            : 'Check your email for the 4-digit code.',
        })
      } catch (err) {
        setSubmitting(false)
        toast.error(err instanceof Error ? err.message : 'Could not send code')
        return
      }
    }
    navigate('/signup/otp')
  }

  return (
    <AuthSplitShell variant="signup">
      <h2 className="text-center font-marketing text-2xl font-extrabold tracking-tight text-[#1A1D26] sm:text-[1.65rem]">
        Start your 7-day free trial
      </h2>
      <p className="mt-2 text-center text-sm text-[#8B93A7]">
        Full Pro features for 7 days — no card required in this demo.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5C6478]"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            autoComplete="email"
            className={`mt-2 ${AUTH_INPUT_CLASS}`}
          />
          <p className="mt-2 text-xs leading-relaxed text-[#8B93A7]">
            We&apos;ll send a 4-digit verification code to your email.
          </p>
        </div>

        <AuthPrimaryButton disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending code…
            </>
          ) : (
            <>
              Request Secure Code
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </AuthPrimaryButton>
      </form>

      <p className="mt-7 text-center text-sm text-[#5C6478]">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: AUTH_ACCENT }}
        >
          Log in →
        </Link>
      </p>
      <p className="mt-4 text-center text-[11px] text-[#A0A8B8]">
        Powered by {BRAND_NAME}
      </p>
    </AuthSplitShell>
  )
}
