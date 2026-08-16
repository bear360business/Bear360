import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  Check,
  ChefHat,
  ChevronDown,
  CreditCard,
  LayoutGrid,
  Menu,
  Package,
  Palette,
  QrCode,
  Receipt,
  Sparkles,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Building2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { BrandLogo } from '@/components/app/BrandLogo'
import { BRAND_NAME, BRAND_DOMAIN } from '@/lib/brand'
import { getIndustriesWithIcons } from '@/lib/industries-catalog'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Industries', href: '#industry-packs' },
  { label: 'Platform', href: '#platform' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '#faq' },
]

const GUEST_DEMO_URL = '/r/masala-bear/table/t-04'

const PRICING = [
  {
    id: 'basic',
    name: 'Starter',
    price: '₹999',
    period: '/mo',
    blurb: 'QR-first single counter',
    features: ['QR menu & ordering', 'Up to 10 tables', 'Basic reports', '7-day full trial'],
  },
  {
    id: 'professional',
    name: 'Pro',
    price: '₹2,499',
    period: '/mo',
    blurb: 'Full-service restaurant',
    popular: true,
    features: ['POS + kitchen display', 'Unlimited tables', 'Inventory & staff', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    blurb: 'Groups & multi-branch',
    features: ['Multi-branch', 'AI insights', 'Custom reports', 'Dedicated onboarding'],
  },
]

const ROTATING = [
  'Restaurants',
  'Cafes',
  'Cloud kitchens',
  'Hotels',
  'Bakeries',
  'Canteens',
  'Resorts',
]

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: QrCode,
    title: 'QR digital menu',
    body: 'Branded table & counter codes. Guests browse, order, and pay from their phone — no app download.',
  },
  {
    icon: Receipt,
    title: 'Smart POS billing',
    body: 'Counter billing with PIN unlock, KOTs, GST splits, and receipts on tablet or phone.',
  },
  {
    icon: ChefHat,
    title: 'Kitchen display',
    body: 'Live tickets by stage — new, preparing, ready — with timers and new-order sound.',
  },
  {
    icon: ShoppingBag,
    title: 'Flexible checkout',
    body: 'Dine-in, takeaway, delivery, room service, parcel fees, and WhatsApp-style checkout.',
  },
  {
    icon: LayoutGrid,
    title: 'Tables & reservations',
    body: 'Floor map, per-table QR, occupancy from live orders, and a simple reservation book.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Menu & categories',
    body: 'Drag-friendly catalogue, sold-out toggles, and themes that style the guest menu live.',
  },
  {
    icon: Package,
    title: 'Smart inventory',
    body: 'Recipes, purchases, wastage log, and stock that deducts when kitchen marks done.',
  },
  {
    icon: Users,
    title: 'Staff & roles',
    body: 'Team roster, POS PINs, permissions, attendance, and payroll-ready summaries.',
  },
  {
    icon: TrendingUp,
    title: 'Reports & finance',
    body: 'Sales, popular items, peak hours, and finance views built for Indian F&B ops.',
  },
  {
    icon: Palette,
    title: 'Brand your menu',
    body: 'Guest themes, QR colours, and admin chrome so every outlet looks like your brand.',
  },
  {
    icon: Building2,
    title: 'Industry packs',
    body: 'Restaurants, cafes, hotels, cloud kitchens, and more — labels and defaults that fit.',
  },
  {
    icon: Sparkles,
    title: 'AI insights',
    body: 'Stock-out hints, menu opportunities, and staffing cues when you grow into Enterprise.',
  },
]

const PLATFORM_TABS = [
  {
    id: 'orders',
    label: 'Orders',
    title: 'Every channel. One kitchen queue.',
    body: 'QR dine-in, POS walk-ins, and partner-style orders land in a single board — floor and kitchen stay in sync.',
  },
  {
    id: 'menu',
    label: 'Menu',
    title: 'Publish once. Sell everywhere.',
    body: 'Catalogue, categories, and live price updates hit the guest QR menu instantly — no reprinting cards.',
  },
  {
    id: 'stock',
    label: 'Stock',
    title: 'Recipes that actually deduct.',
    body: 'Purchases in, recipes linked, stock down when kitchen marks ready — not when someone remembers to adjust.',
  },
  {
    id: 'team',
    label: 'Team',
    title: 'Staff who can run the counter.',
    body: 'POS PINs, roles, attendance, and a kitchen login so the right people see the right screens.',
  },
]

const FAQS = [
  {
    q: 'What is a digital QR menu and how does it help?',
    a: 'Guests scan a code at the table to view your menu, place orders, and pay from their phone. Less waiting, lower print cost, and clearer upsells with photos.',
  },
  {
    q: `Does ${BRAND_NAME} support cloud kitchens and multiple brands?`,
    a: 'Yes. Industry packs cover cloud kitchens, multi-brand style ops, shared inventory patterns, and kitchen routing from one admin dashboard.',
  },
  {
    q: 'Are there commissions on QR orders?',
    a: 'Direct QR and POS orders keep your full ticket — no marketplace commission in the product model. Aggregator channels are optional integrations.',
  },
  {
    q: 'What hardware do I need?',
    a: 'It runs in the browser on Android tablets, iPads, Windows PCs, and phones. Thermal printers plug into the kitchen flow when you are ready.',
  },
  {
    q: 'How fast can I try the demo?',
    a: 'Open the guest QR demo in one tap — scan-style menu at Table 4. Operator logins (restaurant, kitchen, POS) are listed under Live demo with sample credentials.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. Create an account to start a 7-day trial with full Pro features, then pick Starter, Pro, or Enterprise when you are ready.',
  },
]

const TESTIMONIALS = [
  {
    quote:
      'QR ordering cut our peak-hour chaos. Guests order while we keep the floor moving.',
    name: 'Priya Nair',
    role: 'Owner, Coastline Cafe',
  },
  {
    quote:
      'We replaced a heavy POS stack. Billing feels faster and the kitchen board finally matches reality.',
    name: 'Arjun Mehta',
    role: 'Ops lead, Metro Bites',
  },
  {
    quote:
      'Inventory that drops when food is ready changed how we buy stock. Less guesswork every morning.',
    name: 'Sara Fernandes',
    role: 'Chef-owner, Oven & Leaf',
  },
]

const GUEST_DEMOS = [
  {
    to: GUEST_DEMO_URL,
    icon: QrCode,
    title: 'Guest · QR dine-in',
    caption: 'Table 4 — menu → cart → live tracking (no login)',
    featured: true,
  },
  {
    to: '/r/masala-bear',
    icon: ShoppingBag,
    title: 'Guest · Counter QR',
    caption: 'Takeaway & delivery without a table',
    featured: false,
  },
]

const OPERATOR_PORTALS: {
  to: string
  icon: LucideIcon
  title: string
  caption: string
  creds?: { label: string; value: string }[]
}[] = [
  {
    to: '/login',
    icon: Store,
    title: 'Restaurant',
    caption: 'Dashboard, menu, orders, billing',
    creds: [
      { label: 'Email', value: 'riya@masalabear.in' },
      { label: 'Password', value: 'demo1234' },
    ],
  },
  {
    to: '/login?email=kitchen%40masalabear.in',
    icon: ChefHat,
    title: 'Kitchen',
    caption: 'Live KDS — lands on kitchen after sign-in',
    creds: [
      { label: 'Email', value: 'kitchen@masalabear.in' },
      { label: 'Password', value: 'demo1234' },
    ],
  },
  {
    to: '/login?next=%2Fpos',
    icon: Calculator,
    title: 'POS',
    caption: 'Sign in as restaurant, then unlock with PIN',
    creds: [
      { label: 'Email', value: 'riya@masalabear.in' },
      { label: 'Password', value: 'demo1234' },
      { label: 'Staff PIN', value: '1234' },
    ],
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#D6E4F5]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-marketing text-base font-semibold tracking-tight text-[#0B1F3A] sm:text-lg">
          {q}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-[#5B7A9D] transition-transform duration-300',
            open && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-[15px] leading-relaxed text-[#4A6585]">{a}</p>
        </div>
      </div>
    </div>
  )
}

/** Marketing home — calm SaaS layout for India F&B operators. */
export function MarketingLandingPage() {
  const industries = getIndustriesWithIcons()
  const [tab, setTab] = useState(PLATFORM_TABS[0]!.id)
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeTab = PLATFORM_TABS.find((t) => t.id === tab) ?? PLATFORM_TABS[0]!
  const marquee = [...ROTATING, ...ROTATING]

  return (
    <div className="min-h-screen bg-[#F4F8FC] font-marketBody text-[#0B1F3A] antialiased">
      {/* Soft atmosphere wash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 10% -10%, #C8E4FF 0%, transparent 55%), radial-gradient(90% 60% at 90% 0%, #D7F3EE 0%, transparent 50%), linear-gradient(180deg, #EEF5FC 0%, #F4F8FC 40%, #F7FAFD 100%)',
        }}
      />

      <header className="sticky top-0 z-40 border-b border-[#D6E4F5]/70 bg-[#F4F8FC]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <BrandLogo size={36} className="rounded-xl" />
            <span className="font-marketing text-lg font-bold tracking-tight text-[#0B1F3A]">
              {BRAND_NAME}
            </span>
          </a>
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((item) =>
              item.href.startsWith('/') ? (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-sm font-medium text-[#4A6585] transition-colors hover:text-[#0B1F3A]"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-[#4A6585] transition-colors hover:text-[#0B1F3A]"
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/contact#talk"
              className="hidden text-sm font-semibold text-[#2F6FED] sm:inline"
            >
              Talk to us
            </Link>
            <Link
              to="/login"
              className="hidden text-sm font-semibold text-[#0B1F3A] md:inline"
            >
              Log in
            </Link>
            <Link
              to={GUEST_DEMO_URL}
              className="inline-flex h-10 items-center rounded-full bg-[#0B1F3A] px-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              Try demo
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#B8CFE8] bg-white/80 text-[#0B1F3A] lg:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#D6E4F5] bg-[#F4F8FC] px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) =>
                item.href.startsWith('/') ? (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0B1F3A] hover:bg-white"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0B1F3A] hover:bg-white"
                  >
                    {item.label}
                  </a>
                ),
              )}
              <Link
                to="/contact#talk"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#2F6FED] hover:bg-white"
              >
                Talk to us
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#4A6585] hover:bg-white"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-[#2F6FED] text-sm font-semibold text-white"
              >
                Start free trial
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero — Lodgify calm, brand-first */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
            <p className="animate-mkt-fade-up font-marketing text-sm font-semibold uppercase tracking-[0.18em] text-[#2F6FED]">
              Digital menu & POS for India
            </p>
            <h1
              className="animate-mkt-fade-up mt-4 max-w-3xl font-marketing text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-[#0B1F3A] sm:text-6xl lg:text-7xl"
              style={{ animationDelay: '80ms' }}
            >
              {BRAND_NAME}
            </h1>
            <p
              className="animate-mkt-fade-up mt-5 max-w-xl text-lg leading-relaxed text-[#4A6585] sm:text-xl"
              style={{ animationDelay: '140ms' }}
            >
              Less juggling. More serving. One cloud platform for QR menus, POS,
              kitchen, and inventory — built for{' '}
              <span className="font-semibold text-[#0B1F3A]">
                restaurants, cafes, cloud kitchens, hotels
              </span>{' '}
              and more.
            </p>
            <div
              className="animate-mkt-fade-up mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '200ms' }}
            >
              <Link
                to="/signup"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#2F6FED] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(47,111,237,0.7)] transition-transform hover:scale-[1.02]"
              >
                Start 7-day free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={GUEST_DEMO_URL}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#B8CFE8] bg-white/70 px-6 text-sm font-semibold text-[#0B1F3A] backdrop-blur transition-colors hover:bg-white"
              >
                <QrCode className="h-4 w-4" />
                Try guest menu
              </Link>
            </div>
            <p
              className="animate-mkt-fade-up mt-4 text-sm text-[#5B7A9D]"
              style={{ animationDelay: '240ms' }}
            >
              No app download · Works on any phone · Demo venue ready in seconds
            </p>
          </div>

          {/* Full-bleed product plane */}
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="animate-mkt-float relative overflow-hidden rounded-t-[28px] border border-[#C9DCF3] bg-gradient-to-br from-[#0B1F3A] via-[#12335C] to-[#1A4A7A] shadow-[0_40px_80px_-40px_rgba(11,31,58,0.55)]">
              <div
                aria-hidden
                className="absolute inset-0 opacity-40"
                style={{
                  background:
                    'radial-gradient(60% 80% at 80% 20%, #3B82F6 0%, transparent 55%), radial-gradient(40% 50% at 10% 90%, #14B8A6 0%, transparent 50%)',
                }}
              />
              <div className="relative grid gap-6 p-6 sm:grid-cols-[1.1fr_0.9fr] sm:p-10 lg:p-12">
                <div className="text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                    Live floor
                  </p>
                  <p className="mt-3 font-marketing text-2xl font-bold tracking-tight sm:text-3xl">
                    Smart platform for every food venue
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-white/80">
                    <li className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#7DD3FC]" /> POS + UPI-ready checkout
                    </li>
                    <li className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-[#7DD3FC]" /> Branded QR menus
                    </li>
                    <li className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-[#7DD3FC]" /> Kitchen board & KOTs
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>New order · Table 4</span>
                    <span>₹850</span>
                  </div>
                  <p className="mt-3 font-marketing text-lg font-bold text-white">
                    Kerala thali · Extra sambar
                  </p>
                  <div className="mt-4 flex gap-2">
                    <span className="rounded-full bg-[#2F6FED] px-3 py-1 text-xs font-semibold text-white">
                      QR
                    </span>
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                      In kitchen
                    </span>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Revenue', '₹45k'],
                      ['Orders', '128'],
                      ['AOV', '₹352'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-white/10 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/50">
                          {label}
                        </p>
                        <p className="mt-1 font-marketing text-sm font-bold text-white">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Industry marquee */}
        <section className="border-y border-[#D6E4F5] bg-white/50 py-5" aria-label="Industries">
          <div className="overflow-hidden">
            <div className="flex w-max animate-mkt-marquee gap-10 whitespace-nowrap px-4">
              {marquee.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="font-marketing text-sm font-semibold tracking-wide text-[#5B7A9D]"
                >
                  {name}
                  <span className="ml-10 text-[#B8CFE8]">•</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* One platform — Lodgify pattern */}
        <section id="platform" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="font-marketing text-sm font-semibold uppercase tracking-[0.18em] text-[#2F6FED]">
            How it works
          </p>
          <h2 className="mt-3 max-w-2xl font-marketing text-3xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-5xl">
            One platform. Every task handled.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-[#4A6585]">
            Guests order on QR, cashiers bill on POS, cooks see the kitchen board —
            stock updates when food is ready. No hopping between tools.
          </p>

          <div className="mt-10 flex flex-wrap gap-2">
            {PLATFORM_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  tab === t.id
                    ? 'bg-[#0B1F3A] text-white'
                    : 'bg-white text-[#4A6585] ring-1 ring-[#D6E4F5] hover:text-[#0B1F3A]',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-marketing text-2xl font-bold tracking-tight text-[#0B1F3A]">
                {activeTab.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[#4A6585]">
                {activeTab.body}
              </p>
            </div>
            <div className="relative min-h-[220px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#E8F1FB] to-[#D8F5F0] p-8 ring-1 ring-[#C9DCF3]">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#2F6FED]/15 blur-2xl" />
              <p className="relative font-marketing text-sm font-semibold uppercase tracking-wider text-[#2F6FED]">
                {activeTab.label}
              </p>
              <p className="relative mt-6 font-marketing text-3xl font-extrabold text-[#0B1F3A]">
                {activeTab.id === 'orders' && '128 live tickets'}
                {activeTab.id === 'menu' && '240 items synced'}
                {activeTab.id === 'stock' && '12 low-stock alerts'}
                {activeTab.id === 'team' && '5 staff on shift'}
              </p>
              <p className="relative mt-2 text-sm text-[#4A6585]">
                Sample metrics from the demo venue — refresh as you place orders.
              </p>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section id="features" className="bg-white/60 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="font-marketing text-sm font-semibold uppercase tracking-[0.18em] text-[#2F6FED]">
              Plan-ready capabilities
            </p>
            <h2 className="mt-3 max-w-2xl font-marketing text-3xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-5xl">
              Built for growth, priced for India.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-[#4A6585]">
              Everything you need to scale QR ordering and POS — without the bloated
              enterprise bill.
            </p>
            <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F1FB] text-[#2F6FED]">
                    <f.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 font-marketing text-lg font-bold tracking-tight text-[#0B1F3A]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#4A6585]">{f.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-sm text-[#5B7A9D]">
              See India-ready plans below —{' '}
              <a href="#pricing" className="font-semibold text-[#2F6FED] underline-offset-2 hover:underline">
                Pricing
              </a>
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="font-marketing text-sm font-semibold uppercase tracking-[0.18em] text-[#2F6FED]">
            Pricing
          </p>
          <h2 className="mt-3 max-w-2xl font-marketing text-3xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-5xl">
            Clear plans. Priced for India.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-[#4A6585]">
            Start with a 7-day Pro trial. Upgrade when you are ready — no marketplace
            commission on your direct QR & POS orders.
          </p>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-[24px] bg-white p-6 ring-1 ring-[#D6E4F5]',
                  plan.popular && 'relative shadow-[0_24px_50px_-28px_rgba(47,111,237,0.45)] ring-2 ring-[#2F6FED]',
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-[#2F6FED] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-marketing text-xl font-bold text-[#0B1F3A]">{plan.name}</h3>
                <p className="mt-1 text-sm text-[#5B7A9D]">{plan.blurb}</p>
                <p className="mt-5 font-marketing text-4xl font-extrabold tracking-tight text-[#0B1F3A]">
                  {plan.price}
                  {plan.period && (
                    <span className="text-base font-semibold text-[#5B7A9D]">{plan.period}</span>
                  )}
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#4A6585]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2F6FED]" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.id === 'enterprise' ? '/contact#talk' : '/signup'}
                  className={cn(
                    'mt-8 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold transition-transform hover:scale-[1.02]',
                    plan.popular
                      ? 'bg-[#2F6FED] text-white'
                      : 'border border-[#B8CFE8] bg-[#F4F8FD] text-[#0B1F3A]',
                  )}
                >
                  {plan.id === 'enterprise' ? 'Talk to us' : 'Start free trial'}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Cloud kitchen spotlight */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="font-marketing text-sm font-semibold uppercase tracking-[0.18em] text-[#0D9488]">
                Cloud kitchens
              </p>
              <h2 className="mt-3 font-marketing text-3xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-4xl">
                Complete operations for delivery-first brands.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[#4A6585]">
                Multi-brand style workflows, zero-commission direct orders, and
                advanced KOTs from one dashboard built for high-volume kitchens.
              </p>
              <ul className="mt-6 space-y-2 text-sm font-semibold text-[#0B1F3A]">
                <li>Multi-brand POS patterns</li>
                <li>Direct QR & WhatsApp-style orders</li>
                <li>Kitchen-first ticket routing</li>
              </ul>
              <Link
                to="/signup"
                className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-[#0D9488] px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
              >
                Sign up now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative overflow-hidden rounded-[28px] bg-[#0B1F3A] p-8 text-white shadow-[0_30px_60px_-30px_rgba(11,31,58,0.5)]">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">New order</p>
              <p className="mt-2 text-sm text-white/70">Zomato-style · #4492</p>
              <p className="mt-6 font-marketing text-3xl font-extrabold">₹850.00</p>
              <p className="mt-1 text-sm text-white/70">Kerala Eats · Powered by {BRAND_NAME}</p>
              <div className="mt-8 flex items-end justify-between border-t border-white/10 pt-6">
                <div>
                  <p className="text-xs text-white/50">Daily revenue</p>
                  <p className="font-marketing text-xl font-bold">+14%</p>
                </div>
                <ChefHat className="h-10 w-10 text-[#5EEAD4]" />
              </div>
            </div>
          </div>
        </section>

        {/* Industries list */}
        <section id="industry-packs" className="border-y border-[#D6E4F5] bg-white/50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center font-marketing text-2xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-3xl">
              Built for every food business
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-[#4A6585]">
              Industry packs tune labels, services, and nav — restaurants to food trucks.
            </p>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {industries.map((ind) => (
                <li
                  key={ind.id}
                  className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-3 text-sm font-medium text-[#0B1F3A] ring-1 ring-[#D6E4F5]"
                >
                  <ind.icon className="h-4 w-4 shrink-0 text-[#2F6FED]" strokeWidth={1.75} />
                  {ind.name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="font-marketing text-sm font-semibold uppercase tracking-[0.18em] text-[#2F6FED]">
            Operator stories
          </p>
          <h2 className="mt-3 max-w-xl font-marketing text-3xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-4xl">
            Less software friction on the floor
          </h2>
          <p className="mt-3 text-sm text-[#5B7A9D]">
            Example stories that mirror how Indian venues use QR + POS day to day.
          </p>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name}>
                <p className="text-[15px] leading-relaxed text-[#4A6585]">“{t.quote}”</p>
                <footer className="mt-5">
                  <p className="font-marketing text-sm font-bold text-[#0B1F3A]">{t.name}</p>
                  <p className="text-xs text-[#5B7A9D]">{t.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-white/60 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-marketing text-3xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-[#4A6585]">
              Everything you need to know about {BRAND_NAME} digital menu & POS.
            </p>
            <div className="mt-10">
              {FAQS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* Demo portals — guest first */}
        <section id="demo" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <p className="font-marketing text-sm font-semibold uppercase tracking-[0.18em] text-[#2F6FED]">
            Live demo
          </p>
          <h2 className="mt-3 font-marketing text-3xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-4xl">
            Experience it in 10 seconds
          </h2>
          <p className="mt-3 max-w-xl text-[#4A6585]">
            Start as a guest — no login. Then open operator tools with the sample
            credentials below.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {GUEST_DEMOS.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className={cn(
                  'group relative flex flex-col overflow-hidden rounded-[24px] p-6 transition-shadow',
                  p.featured
                    ? 'bg-[#0B1F3A] text-white shadow-[0_24px_50px_-28px_rgba(11,31,58,0.55)]'
                    : 'bg-white text-[#0B1F3A] ring-1 ring-[#D6E4F5] hover:shadow-[0_16px_40px_-24px_rgba(11,31,58,0.35)]',
                )}
              >
                {p.featured && (
                  <span className="absolute right-4 top-4 rounded-full bg-[#2F6FED] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Recommended
                  </span>
                )}
                <span
                  className={cn(
                    'inline-flex h-11 w-11 items-center justify-center rounded-xl',
                    p.featured ? 'bg-white/10 text-[#7DD3FC]' : 'bg-[#E8F1FB] text-[#2F6FED]',
                  )}
                >
                  <p.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-marketing text-lg font-bold">{p.title}</h3>
                <p className={cn('mt-1 flex-1 text-sm', p.featured ? 'text-white/70' : 'text-[#5B7A9D]')}>
                  {p.caption}
                </p>
                <span
                  className={cn(
                    'mt-5 inline-flex items-center gap-1 text-sm font-semibold',
                    p.featured ? 'text-[#7DD3FC]' : 'text-[#2F6FED]',
                  )}
                >
                  Open demo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          <h3 className="mt-14 font-marketing text-lg font-bold text-[#0B1F3A]">
            For restaurant operators
          </h3>
          <p className="mt-1 text-sm text-[#5B7A9D]">
            Sign in with these demo accounts — password is always{' '}
            <span className="font-semibold text-[#0B1F3A]">demo1234</span>.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {OPERATOR_PORTALS.map((p) => (
              <Link
                key={`${p.title}-${p.to}`}
                to={p.to}
                className="group flex flex-col rounded-2xl bg-white p-5 ring-1 ring-[#D6E4F5] transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(11,31,58,0.35)]"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F1FB] text-[#2F6FED]">
                  <p.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-marketing text-base font-bold text-[#0B1F3A]">
                  {p.title}
                </h3>
                <p className="mt-1 text-sm text-[#5B7A9D]">{p.caption}</p>
                {p.creds && (
                  <dl className="mt-3 space-y-1.5 rounded-xl bg-[#F4F8FD] px-3 py-2.5 text-xs">
                    {p.creds.map((c) => (
                      <div
                        key={c.label}
                        className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-2"
                      >
                        <dt className="shrink-0 text-[#5B7A9D]">{c.label}</dt>
                        <dd className="break-all font-mono font-semibold text-[#0B1F3A] sm:text-right">
                          {c.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#2F6FED]">
                  Open
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-[#5B7A9D]">
            Platform admin & full portal list →{' '}
            <Link to="/portals" className="font-semibold text-[#2F6FED] underline-offset-2 hover:underline">
              All portals
            </Link>
          </p>
        </section>
      </main>

      <footer className="border-t border-[#D6E4F5] bg-[#0B1F3A] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandLogo size={32} className="rounded-lg" />
              <span className="font-marketing text-lg font-bold">{BRAND_NAME}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
              QR digital menu, POS billing, and restaurant ops — one cloud product for
              Bharat&apos;s food businesses.
            </p>
            <p className="mt-4 text-xs text-white/40">{BRAND_DOMAIN}</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm">
            <div>
              <p className="font-semibold text-white/90">Explore</p>
              <ul className="mt-3 space-y-2 text-white/55">
                <li>
                  <a href="#features" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link to={GUEST_DEMO_URL} className="hover:text-white">
                    Live demo
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white/90">Product</p>
              <ul className="mt-3 space-y-2 text-white/55">
                <li>
                  <a href="#features" className="hover:text-white">
                    POS billing
                  </a>
                </li>
                <li>
                  <Link to={GUEST_DEMO_URL} className="hover:text-white">
                    QR digital menu
                  </Link>
                </li>
                <li>
                  <a href="#platform" className="hover:text-white">
                    Kitchen display
                  </a>
                </li>
                <li>
                  <a href="#platform" className="hover:text-white">
                    Inventory
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
          © {new Date().getFullYear()} {BRAND_NAME}. QR menu, POS & restaurant ops for India.
        </div>
      </footer>

      {/* Sticky Talk to us */}
      <Link
        to="/contact#talk"
        className="fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-[#2F6FED] px-5 text-sm font-semibold text-white shadow-[0_16px_40px_-12px_rgba(47,111,237,0.7)] transition-transform hover:scale-[1.03]"
      >
        Talk to us
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
