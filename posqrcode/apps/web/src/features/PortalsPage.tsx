import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  ChefHat,
  QrCode,
  Shield,
  Store,
  type LucideIcon,
} from 'lucide-react'
import { BrandLogo } from '@/components/app/BrandLogo'
import { BRAND_NAME } from '@/lib/brand'
import { getIndustriesWithIcons } from '@/lib/industries-catalog'

interface Portal {
  to: string
  icon: LucideIcon
  title: string
  caption: string
  cta: string
  creds?: { label: string; value: string }[]
}

const portals: Portal[] = [
  {
    to: '/login',
    icon: Store,
    title: 'Restaurant',
    caption: 'Masala Bear — tables, menu, orders, reports',
    cta: 'Sign in',
    creds: [
      { label: 'Email', value: 'riya@masalabear.in' },
      { label: 'Password', value: 'demo1234' },
    ],
  },
  {
    to: '/login?email=kitchen%40masalabear.in',
    icon: ChefHat,
    title: 'Kitchen',
    caption: 'Live kitchen display — lands on KDS after sign-in',
    cta: 'Sign in',
    creds: [
      { label: 'Email', value: 'kitchen@masalabear.in' },
      { label: 'Password', value: 'demo1234' },
    ],
  },
  {
    to: '/super/login',
    icon: Shield,
    title: 'Super',
    caption: 'Platform control — restaurants, plans, settings',
    cta: 'Sign in',
    creds: [
      { label: 'Email', value: 'anya@bear360.app' },
      { label: 'Password', value: 'demo1234' },
    ],
  },
  {
    to: '/staff-login',
    icon: Calculator,
    title: 'Staff',
    caption: 'PIN login — sidebar shows only modules the owner enabled',
    cta: 'Staff sign in',
    creds: [
      { label: 'Cashier', value: '98765 41002 / 1234' },
      { label: 'Waiter', value: '98765 41004 / 2222' },
      { label: 'Manager', value: '98765 41001 / 1111' },
    ],
  },
  {
    to: '/pos',
    icon: Calculator,
    title: 'POS (owner)',
    caption: 'Counter billing — owner login first, then staff PIN unlock',
    cta: 'Open POS',
    creds: [{ label: 'Staff PIN', value: '1234' }],
  },
  {
    to: '/r/masala-bear/table/t-04',
    icon: QrCode,
    title: 'Customer · QR demo',
    caption: 'Scan-to-order at Table 4 — menu → cart → live tracking',
    cta: 'Open demo',
  },
]

/** Landing at `/portals` — every portal entry with demo credentials. */
export function PortalsPage() {
  return (
    <div className="force-light flex min-h-screen flex-col items-center justify-center bg-surface-page px-4 py-12">
      <BrandLogo size={72} className="rounded-2xl shadow-raised" />
      <h1 className="mt-4 font-display text-3xl font-bold text-foreground">{BRAND_NAME}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Multi-industry food OS · QR ordering · POS · inventory — pick a portal
      </p>

      <div className="mt-10 grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portals.map((portal) => (
          <Link
            key={`${portal.title}-${portal.to}`}
            to={portal.to}
            className="group flex flex-col rounded-card border border-line bg-surface p-6 shadow-card transition-shadow hover:shadow-raised"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint">
              <portal.icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
            </span>
            <h2 className="mt-4 text-base font-semibold text-foreground">{portal.title}</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{portal.caption}</p>
            {portal.creds && (
              <dl className="mt-3 space-y-1.5 rounded-xl border border-line bg-surface-muted px-3 py-2.5 text-xs">
                {portal.creds.map((c) => (
                  <div
                    key={c.label}
                    className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-2"
                  >
                    <dt className="shrink-0 text-muted-foreground">{c.label}</dt>
                    <dd className="break-all font-mono font-semibold text-foreground sm:text-right">
                      {c.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-2 group-hover:underline">
              {portal.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-14 w-full max-w-3xl">
        <h2 className="text-center font-display text-xl font-bold text-foreground">
          Built for every food business
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Same product, industry-tuned defaults
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2">
          {getIndustriesWithIcons().map((ind) => (
            <li
              key={ind.id}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {ind.name}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10">
        <Link to="/" className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  )
}
