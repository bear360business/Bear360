import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { toast } from 'sonner'
import { BrandLogo } from '@/components/app/BrandLogo'
import { BRAND_DOMAIN, BRAND_NAME } from '@/lib/brand'
import {
  LEAD_INTEREST_META,
  SUPER_INBOX_EMAIL,
  useLeads,
  type LeadInterest,
} from '@/hooks/use-leads'
import { cn } from '@/lib/utils'

const TEAM = [
  {
    name: 'Anya Rao',
    role: 'Head of Growth',
    focus: 'Enterprise & multi-branch deals',
    email: SUPER_INBOX_EMAIL,
    initials: 'AR',
  },
  {
    name: 'Karthik Menon',
    role: 'Marketing lead',
    focus: 'Campaigns, partners & demos',
    email: 'karthik@bear360.app',
    initials: 'KM',
  },
  {
    name: 'Meera Shah',
    role: 'Customer success',
    focus: 'Onboarding & restaurant trials',
    email: 'meera@bear360.app',
    initials: 'MS',
  },
]

const fieldClass =
  'mt-1.5 h-11 w-full rounded-xl border border-[#D8DEE9] bg-white px-3 text-sm text-[#0B1F3A] outline-none placeholder:text-[#94A3B8] focus:border-[#2F6FED] focus:ring-2 focus:ring-[#2F6FED]/20'

/** Public contact + Talk to us form. */
export function ContactPage() {
  const { submitLead } = useLeads()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [interest, setInterest] = useState<LeadInterest>('demo')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (sending) return
    if (!name.trim() || !email.includes('@') || message.trim().length < 10) {
      toast.error('Please fill name, email, and a short message (10+ characters)')
      return
    }
    setSending(true)
    submitLead({
      name,
      email,
      phone,
      businessName,
      city,
      interest,
      message,
    })
    toast.success('Message sent', {
      description: 'Thanks — our team will reply soon.',
    })
    setName('')
    setEmail('')
    setPhone('')
    setBusinessName('')
    setCity('')
    setInterest('demo')
    setMessage('')
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-[#F4F8FC] font-marketBody text-[#0B1F3A] antialiased">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(100% 70% at 0% 0%, #C8E4FF 0%, transparent 50%), linear-gradient(180deg, #EEF5FC 0%, #F4F8FC 100%)',
        }}
      />

      <header className="sticky top-0 z-40 border-b border-[#D6E4F5]/70 bg-[#F4F8FC]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo size={36} className="rounded-xl" />
            <span className="font-marketing text-lg font-bold tracking-tight">{BRAND_NAME}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-semibold text-[#4A6585] hover:text-[#0B1F3A]">
              Home
            </Link>
            <a
              href="#talk"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#2F6FED] px-4 text-sm font-semibold text-white"
            >
              Talk to us
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="font-marketing text-sm font-semibold uppercase tracking-[0.18em] text-[#2F6FED]">
          Contact
        </p>
        <h1 className="mt-3 max-w-2xl font-marketing text-4xl font-extrabold tracking-tight sm:text-5xl">
          Talk to the {BRAND_NAME} team
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[#4A6585]">
          Sales, demos, and partnerships — our growth team replies to{' '}
          {SUPER_INBOX_EMAIL}.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 text-sm text-[#4A6585]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#D6E4F5]">
            <Mail className="h-4 w-4 text-[#2F6FED]" />
            {SUPER_INBOX_EMAIL}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#D6E4F5]">
            <Phone className="h-4 w-4 text-[#2F6FED]" />
            +91 98765 36000
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 ring-1 ring-[#D6E4F5]">
            <MapPin className="h-4 w-4 text-[#2F6FED]" />
            Mumbai · Bengaluru · remote
          </span>
        </div>

        {/* Marketing team */}
        <section className="mt-16">
          <h2 className="font-marketing text-2xl font-extrabold tracking-tight">
            Marketing & growth team
          </h2>
          <p className="mt-2 text-[#4A6585]">
            The people who help restaurants go live on {BRAND_NAME}.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {TEAM.map((m) => (
              <li
                key={m.email}
                className="rounded-[22px] bg-white p-5 ring-1 ring-[#D6E4F5]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B1F3A] font-marketing text-sm font-bold text-white">
                  {m.initials}
                </div>
                <h3 className="mt-4 font-marketing text-base font-bold">{m.name}</h3>
                <p className="text-sm font-semibold text-[#2F6FED]">{m.role}</p>
                <p className="mt-1 text-sm text-[#5B7A9D]">{m.focus}</p>
                <a
                  href={`mailto:${m.email}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0B1F3A] hover:text-[#2F6FED]"
                >
                  {m.email}
                  <ArrowRight className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Talk to us form */}
        <section id="talk" className="mt-16 scroll-mt-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="font-marketing text-2xl font-extrabold tracking-tight">
                Talk to us
              </h2>
              <p className="mt-2 text-[#4A6585]">
                Tell us about your venue. We&apos;ll get back within one business day.
              </p>
              <ul className="mt-6 space-y-2 text-sm font-medium text-[#0B1F3A]">
                <li>· Product walkthrough for your industry</li>
                <li>· Pricing for multi-outlet groups</li>
                <li>· Partner / reseller conversations</li>
              </ul>
              <p className="mt-6 text-xs text-[#5B7A9D]">
                Prefer WhatsApp-style? Add your phone — we&apos;ll note it on the lead.
                Domain: {BRAND_DOMAIN}
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="rounded-[24px] bg-white p-6 shadow-[0_24px_50px_-32px_rgba(11,31,58,0.35)] ring-1 ring-[#D6E4F5] sm:p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6478]">
                  Your name *
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                    placeholder="Priya Sharma"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6478]">
                  Work email *
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                    placeholder="priya@cafe.in"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6478]">
                  Phone
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldClass}
                    placeholder="+91 98xxx xxxxx"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6478]">
                  City
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={fieldClass}
                    placeholder="Mumbai"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6478] sm:col-span-2">
                  Business name
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={fieldClass}
                    placeholder="Coastline Cafe"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6478] sm:col-span-2">
                  I&apos;m interested in
                  <select
                    value={interest}
                    onChange={(e) => setInterest(e.target.value as LeadInterest)}
                    className={cn(fieldClass, 'appearance-none')}
                  >
                    {LEAD_INTEREST_META.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5C6478] sm:col-span-2">
                  Message *
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#D8DEE9] bg-white px-3 py-2.5 text-sm text-[#0B1F3A] outline-none placeholder:text-[#94A3B8] focus:border-[#2F6FED] focus:ring-2 focus:ring-[#2F6FED]/20"
                    placeholder="Tell us about your outlets, timeline, and what you need…"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2F6FED] text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending…' : 'Send message'}
              </button>
              <p className="mt-3 text-center text-xs text-[#5B7A9D]">
                Replies from <span className="font-semibold">{SUPER_INBOX_EMAIL}</span>
              </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#D6E4F5] py-8 text-center text-sm text-[#5B7A9D]">
        <Link to="/" className="font-semibold text-[#2F6FED] hover:underline">
          ← Back to {BRAND_NAME}
        </Link>
      </footer>
    </div>
  )
}
