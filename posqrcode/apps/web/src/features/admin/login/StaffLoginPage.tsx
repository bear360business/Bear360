import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AuthPrimaryButton,
  AuthSplitShell,
  AUTH_ACCENT,
  AUTH_INPUT_CLASS,
} from '@/features/admin/signup/AuthSplitShell'
import { useAuth } from '@/hooks/use-auth'
import { useStaff } from '@/hooks/use-staff'
import { getCurrentRestaurantId } from '@/lib/mock/restaurants'
import { useMockData } from '@/lib/runtime-config'
import {
  EMPTY_POS_PERMS,
  findStaffByLogin,
  resolvePosPermissions,
  staffLandingPath,
} from '@/lib/staff-access'
import { cn } from '@/lib/utils'

/** Staff portal login — mobile + PIN from Staff → POS Staff. */
export function StaffLoginPage() {
  const navigate = useNavigate()
  const { loginStaff } = useAuth()
  const { employees } = useStaff()
  const mock = useMockData()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    const restaurantId = getCurrentRestaurantId() || 'masala-bear'

    if (!mock) {
      try {
        const session = await loginStaff({
          phone,
          employeeId: 'api',
          staffName: 'Staff',
          restaurantId,
          posPermissions: { ...EMPTY_POS_PERMS },
          pin,
        })
        const perms = session.posPermissions ?? {
          ...EMPTY_POS_PERMS,
          posTerminal: true,
          orders: true,
        }
        try {
          if (perms.posTerminal) {
            sessionStorage.setItem(
              'bearqr:pos-session',
              JSON.stringify({
                employeeId: session.employeeId,
                name: session.staffName,
                perms,
              }),
            )
          }
        } catch {
          /* ignore */
        }
        const dest = staffLandingPath(perms)
        toast.success(`Welcome, ${session.staffName ?? 'staff'}`)
        setTimeout(() => navigate(dest, { replace: true }), 300)
      } catch (err) {
        setSubmitting(false)
        toast.error(err instanceof Error ? err.message : 'Invalid mobile or PIN')
      }
      return
    }

    const match = findStaffByLogin(phone, pin, employees)
    if (!match) {
      setSubmitting(false)
      toast.error('Invalid mobile or PIN', {
        description: 'Ask your manager, or check Staff → POS Staff.',
      })
      return
    }

    const perms = resolvePosPermissions(match)
    await loginStaff({
      phone: match.phone,
      employeeId: match.id,
      staffName: match.name,
      restaurantId,
      posPermissions: perms,
    })

    try {
      if (perms.posTerminal) {
        sessionStorage.setItem(
          'bearqr:pos-session',
          JSON.stringify({
            employeeId: match.id,
            name: match.name,
            perms,
          }),
        )
      }
    } catch {
      /* ignore */
    }

    const dest = staffLandingPath(perms)
    toast.success(`Welcome, ${match.name}`)
    setTimeout(() => navigate(dest, { replace: true }), 300)
  }

  return (
    <AuthSplitShell
      variant="login"
      legal="Staff access is granted by your restaurant manager. Authorized use only."
    >
      <h2 className="text-center font-marketing text-2xl font-extrabold tracking-tight text-[#1A1D26]">
        Staff sign in
      </h2>
      <p className="mt-1 text-center text-sm text-[#8B93A7]">
        Use the mobile number and PIN from your manager · demo Priya{' '}
        <span className="font-medium">98765 41002</span> /{' '}
        <span className="font-medium">1234</span>
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5C6478]">
            Mobile number
          </span>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="98765 41002"
            className={cn(AUTH_INPUT_CLASS, 'mt-2')}
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5C6478]">
            Login PIN
          </span>
          <input
            type="password"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="4–6 digits"
            className={cn(AUTH_INPUT_CLASS, 'mt-2 tracking-[0.3em]')}
          />
        </label>

        <AuthPrimaryButton disabled={submitting || pin.length < 4}>
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

      <p className="mt-6 text-center text-sm text-[#8B93A7]">
        Restaurant owner?{' '}
        <Link to="/login" className="font-semibold" style={{ color: AUTH_ACCENT }}>
          Owner login →
        </Link>
      </p>
    </AuthSplitShell>
  )
}
