import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  clearStoreSetupPending,
  isStoreSetupPending,
  readOnboardingDraft,
} from '@/features/admin/onboarding/store-setup'
import {
  AuthPrimaryButton,
  AuthSplitShell,
  AUTH_ACCENT,
  AUTH_INPUT_CLASS,
} from '@/features/admin/signup/AuthSplitShell'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

/** Restaurant admin login — Huno-style split shell. */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { login } = useAuth()
  const [email, setEmail] = useState(
    () => params.get('email')?.trim() || 'riya@masalabear.in',
  )
  const [password, setPassword] = useState('demo1234')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const trimmed = email.trim().toLowerCase()
    const result = await login(trimmed, password)
    if (!result.ok) {
      setSubmitting(false)
      toast.error(result.error)
      return
    }

    const pendingEmail = readOnboardingDraft()?.email?.toLowerCase()
    const resumeSetup =
      isStoreSetupPending() && pendingEmail != null && pendingEmail === trimmed
    if (isStoreSetupPending() && !resumeSetup) {
      clearStoreSetupPending()
    }

    const intended =
      params.get('next') ||
      (typeof (location.state as { from?: string } | null)?.from === 'string'
        ? (location.state as { from: string }).from
        : null)
    const safeNext =
      intended &&
      intended.startsWith('/') &&
      !intended.startsWith('//') &&
      !intended.startsWith('/super')
        ? intended
        : null

    const dest =
      resumeSetup
        ? '/onboarding'
        : result.session.role === 'kitchen'
          ? '/kitchen'
          : result.session.role === 'super'
            ? '/super/dashboard'
            : safeNext || '/dashboard'
    setTimeout(() => navigate(dest, { replace: true }), 400)
  }

  return (
    <AuthSplitShell
      variant="login"
      legal="By signing in, you agree to our Terms of Service and Privacy Policy. Authorized access only."
    >
      <h2 className="text-center font-marketing text-2xl font-extrabold tracking-tight text-[#1A1D26]">
        Welcome back
      </h2>
      <p className="mt-1 text-center text-sm text-[#8B93A7]">
        Sign in to manage your restaurant · demo password <span className="font-medium">demo1234</span>
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
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className={cn(AUTH_INPUT_CLASS, 'mt-2')}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5C6478]">
            Password
          </span>
          <div className="relative mt-2">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={cn(AUTH_INPUT_CLASS, 'pr-11')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#8B93A7]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <AuthPrimaryButton disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </AuthPrimaryButton>
      </form>

      <p className="mt-4 text-center text-sm text-[#8B93A7]">
        <Link to="/forgot-password" className="hover:text-[#1A1D26]">
          Forgot password?
        </Link>
        {' · '}
        <Link to="/staff-login" className="hover:text-[#1A1D26]">
          Staff PIN login
        </Link>
      </p>

      <div className="mt-8 -mx-8 -mb-8 overflow-hidden border-t border-[#EEF1F6] bg-[#F7F8FB] px-8 py-4 text-center text-sm text-[#5C6478] sm:-mx-10 sm:-mb-10 sm:px-10">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-semibold" style={{ color: AUTH_ACCENT }}>
          Create your store →
        </Link>
      </div>
    </AuthSplitShell>
  )
}
