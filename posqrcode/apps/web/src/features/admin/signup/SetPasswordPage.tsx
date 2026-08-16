import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AuthPrimaryButton, AuthSplitShell, AUTH_ACCENT, AUTH_INPUT_CLASS } from './AuthSplitShell'
import { cn } from '@/lib/utils'
import { clearSignupDraft, readSignupDraft } from './signup-draft'
import { markStoreSetupPending } from '@/features/admin/onboarding/store-setup'
import { useAuth } from '@/hooks/use-auth'

/** After email OTP — set password, then store setup gate. */
export function SetPasswordPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const draft = readSignupDraft()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /** Prevents Navigate-to-/signup after we clear the draft on success. */
  const [completed, setCompleted] = useState(false)

  if (!draft && !completed) return <Navigate to="/signup" replace />
  if (draft && !draft.otpVerified && !completed) {
    return <Navigate to="/signup/otp" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting || !draft) return
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setSubmitting(true)
    const result = await register(draft.email, password, draft.verificationToken)
    if (!result.ok) {
      setSubmitting(false)
      setError(result.error)
      return
    }
    markStoreSetupPending(draft.email)
    setCompleted(true)
    clearSignupDraft()
    toast.success('Account ready', {
      description: 'Next: set up your store profile.',
    })
    navigate('/onboarding', { replace: true })
  }

  return (
    <AuthSplitShell variant="signup">
      <h2 className="font-marketing text-2xl font-extrabold tracking-tight text-[#1A1D26]">
        Set your password
      </h2>
      <p className="mt-1 text-sm text-[#8B93A7]">
        Secure{' '}
        <span className="font-medium text-[#5C6478]">{draft?.email ?? 'your account'}</span>
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5C6478]">
            New password
          </span>
          <div className="relative mt-2">
            <input
              type={show ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className={cn(AUTH_INPUT_CLASS, 'pr-11')}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#8B93A7]"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5C6478]">
            Confirm password
          </span>
          <input
            type={show ? 'text' : 'password'}
            required
            minLength={8}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setError('')
            }}
            placeholder="Re-enter password"
            autoComplete="new-password"
            className={cn(AUTH_INPUT_CLASS, 'mt-2')}
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}

        <AuthPrimaryButton disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Continue to store setup'
          )}
        </AuthPrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#5C6478]">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold" style={{ color: AUTH_ACCENT }}>
          Log in →
        </Link>
      </p>
    </AuthSplitShell>
  )
}
