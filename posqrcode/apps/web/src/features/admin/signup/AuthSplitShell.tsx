import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { BrandLogo } from '@/components/app/BrandLogo'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

/** Soft periwinkle accent — Huno-style auth CTAs (not purple gradient SaaS). */
export const AUTH_ACCENT = '#8DA9FF'
export const AUTH_ACCENT_HOVER = '#7A98F5'

/** Forced light inputs — survives dark mode / chrome text / browser autofill. */
export const AUTH_INPUT_CLASS =
  'h-12 w-full rounded-xl border border-[#D8DEE9] bg-white px-4 text-sm text-[#1A1D26] outline-none transition-shadow placeholder:text-[#A0A8B8] focus:border-[#8DA9FF] focus:ring-2 focus:ring-[#8DA9FF]/25 [color-scheme:light] [&:-webkit-autofill]:[-webkit-text-fill-color:#1A1D26] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#fff]'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1556745753-b2904692b3cd?auto=format&fit=crop&w=1600&q=80'

export type AuthSplitVariant = 'signup' | 'login' | 'otp'

const PANELS: Record<
  AuthSplitVariant,
  { headline: React.ReactNode; features: string[] }
> = {
  signup: {
    headline: (
      <>
        The <span style={{ color: AUTH_ACCENT }}>Smartest Way</span> to Manage Your
        Restaurant.
      </>
    ),
    features: [
      'Zero commission QR ordering',
      'Real-time inventory tracking',
      'Multi-industry menu & POS',
    ],
  },
  login: {
    headline: (
      <>
        Grow with <span style={{ color: AUTH_ACCENT }}>{BRAND_NAME}</span> — QR,
        POS & kitchen in one place
      </>
    ),
    features: [
      'Dynamic QR menus in seconds',
      'Kitchen & order management',
      'Sales analytics dashboard',
    ],
  },
  otp: {
    headline: (
      <>
        Grow with <span style={{ color: AUTH_ACCENT }}>{BRAND_NAME}</span> — QR,
        POS & kitchen in one place
      </>
    ),
    features: [
      'Dynamic QR menus in seconds',
      'Kitchen & order management',
      'Sales analytics dashboard',
    ],
  },
}

export function AuthSplitShell({
  variant,
  children,
  legal,
}: {
  variant: AuthSplitVariant
  children: React.ReactNode
  legal?: string
}) {
  const panel = PANELS[variant]

  return (
    <div
      className="auth-shell flex min-h-screen bg-white font-marketBody text-[#1A1D26]"
      style={{ colorScheme: 'light' }}
    >
      {/* Left marketing plane */}
      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        <img
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/35"
        />
        <div className="relative z-10 flex h-full flex-col px-10 py-10 xl:px-14">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo size={40} className="rounded-xl" />
            <div>
              <p className="font-marketing text-sm font-bold tracking-wide text-white">
                {BRAND_NAME.toUpperCase()}
              </p>
              <p className="text-[11px] text-white/70">Your complete QR menu solution</p>
            </div>
          </Link>

          <div className="mt-auto max-w-lg pb-6">
            <h1 className="font-marketing text-4xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-5xl">
              {panel.headline}
            </h1>
            <ul className="mt-8 space-y-3.5">
              {panel.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[15px] text-white/90">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: AUTH_ACCENT }}
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Right form plane */}
      <main className="relative flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2 lg:px-10">
        <div className="mb-5 flex flex-col items-center gap-2 lg:mb-6">
          <BrandLogo size={44} className="rounded-xl shadow-sm" />
          <span className="font-marketing text-sm font-bold tracking-wide text-[#5C6478] lg:hidden">
            {BRAND_NAME}
          </span>
        </div>

        <div className="w-full max-w-[420px] rounded-[22px] border border-[#E8ECF2] bg-white p-8 shadow-[0_18px_50px_-28px_rgba(26,29,38,0.35)] sm:p-10">
          {children}
        </div>

        <p className="mt-8 max-w-sm text-center text-[11px] leading-relaxed text-[#8B93A7]">
          {legal ??
            'By continuing, you agree to our Terms and Privacy Policy.'}
        </p>
      </main>
    </div>
  )
}

export function AuthPrimaryButton({
  children,
  className,
  type = 'submit',
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-transform enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      style={{ backgroundColor: AUTH_ACCENT, ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
