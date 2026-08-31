import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CloudUpload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { IndustryPicker } from '@/components/app/IndustryPicker'
import { BRAND_DOMAIN, BRAND_NAME } from '@/lib/brand'
import { useAuth } from '@/hooks/use-auth'
import { setCurrentRestaurantId, useRestaurants } from '@/hooks/use-restaurants'
import { useServiceConfig } from '@/hooks/use-service-config'
import { notifyVenueIndustryChanged, useTenant } from '@/hooks/use-tenant'
import type { PlanId } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  ONBOARDING_PLANS,
  ONBOARDING_STEPS,
  clearStoreSetupPending,
  emptyDraft,
  readOnboardingDraft,
  slugify,
  writeOnboardingDraft,
  type StoreOnboardingDraft,
} from './store-setup'

const fieldClass =
  'mt-1.5 h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] outline-none transition-shadow placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20'

/** Self-serve create-store wizard — same steps/labels as super-admin Create store. */
export function StoreOnboardingPage() {
  const navigate = useNavigate()
  const { create } = useRestaurants()
  const { bindRestaurant } = useAuth()
  const { setPlan } = useTenant()
  const { applyIndustryDefaults } = useServiceConfig()
  const [draft, setDraft] = useState<StoreOnboardingDraft>(
    () => readOnboardingDraft() ?? emptyDraft(),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const logoInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    writeOnboardingDraft(draft)
  }, [draft])

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [draft.step])

  const step = Math.min(Math.max(draft.step, 0), ONBOARDING_STEPS.length - 1)
  const patch = (p: Partial<StoreOnboardingDraft>) => setDraft((d) => ({ ...d, ...p }))

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!draft.businessName.trim()) {
        setError('Business name is required')
        return false
      }
      if (!draft.slug.trim()) {
        setError('Store URL slug is required')
        return false
      }
      if (!draft.ownerName.trim()) {
        setError('Owner name is required')
        return false
      }
    }
    if (step === 1) {
      const digits = draft.phone.replace(/\D/g, '')
      if (digits.length < 10) {
        setError('Enter a valid 10-digit phone number')
        return false
      }
      if (draft.publicEmail && !draft.publicEmail.includes('@')) {
        setError('Enter a valid public email')
        return false
      }
    }
    setError('')
    return true
  }

  const next = () => {
    if (!validateStep()) return
    if (step < ONBOARDING_STEPS.length - 1) {
      patch({ step: step + 1 })
    }
  }

  const prev = () => {
    setError('')
    if (step > 0) patch({ step: step - 1 })
  }

  const finish = () => {
    if (saving) return
    if (!validateStep()) return
    if (!draft.businessName.trim() || !draft.slug.trim()) {
      patch({ step: 0 })
      setError('Complete business information first')
      return
    }
    const phoneDigits = draft.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      patch({ step: 1 })
      setError('Enter a valid 10-digit phone number')
      return
    }

    setSaving(true)
    void (async () => {
      try {
        const chosen: PlanId = draft.planId
        const venue = await create({
          name: draft.businessName.trim(),
          slug: draft.slug.trim(),
          ownerName: draft.ownerName.trim() || draft.businessName.trim(),
          ownerEmail: draft.publicEmail.trim() || draft.email,
          phone: phoneDigits || undefined,
          city: draft.city.trim() || undefined,
          address: draft.address.trim() || undefined,
          cuisine: draft.description.trim() || undefined,
          industryId: draft.industryId,
          planId: chosen,
          currency: draft.currency,
          logoImage: draft.logoDataUrl,
          coverImage: draft.coverDataUrl,
          whatsapp: draft.whatsapp.trim() || phoneDigits,
          mapsLink: draft.mapsLink.trim() || undefined,
          country: draft.country,
        })
        setCurrentRestaurantId(venue.id)
        await bindRestaurant(venue.id)
        setPlan(chosen)
        applyIndustryDefaults(draft.industryId)
        notifyVenueIndustryChanged()
        clearStoreSetupPending()
        toast.success(`${venue.name} is live`, {
          description: `Plan: ${ONBOARDING_PLANS.find((p) => p.id === chosen)?.name ?? chosen}`,
        })
        navigate('/dashboard', { replace: true })
      } catch (err) {
        setSaving(false)
        toast.error(err instanceof Error ? err.message : 'Could not create store — try again')
      }
    })()
  }

  const readFile = (file: File, key: 'logoDataUrl' | 'coverDataUrl') => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Max file size is 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => patch({ [key]: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <div ref={topRef} className="mx-auto max-w-4xl">
      <div className="text-center">
        <h1 className="font-marketing text-3xl font-extrabold tracking-tight text-[#0F172A]">
          Create store
        </h1>
        <p className="mt-2 text-[#64748B]">
          Let&apos;s get your store online — business, contacts, location, then plan.
        </p>
      </div>

      <ol className="mx-auto mt-10 flex max-w-2xl items-center justify-between">
        {ONBOARDING_STEPS.map((s, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={s.id} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2',
                    i <= step ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]',
                  )}
                  style={{ right: '50%', width: '100%', zIndex: 0 }}
                />
              )}
              <span
                className={cn(
                  'relative z-[1] flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
                  done || active ? 'bg-[#22C55E] text-white' : 'bg-[#E2E8F0] text-[#64748B]',
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  'mt-2 text-center text-[10px] font-bold uppercase tracking-[0.12em]',
                  active || done ? 'text-[#0F172A]' : 'text-[#94A3B8]',
                )}
              >
                {s.label}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mt-10 rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.25)] sm:p-8">
        {step === 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F172A]">
              Business information
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Provide the necessary details to register your business with us.
            </p>
            <div className="mt-6 space-y-4">
              <Field label="Business name *">
                <input
                  className={fieldClass}
                  placeholder="e.g. Casey's Cupcakes"
                  value={draft.businessName}
                  onChange={(e) => {
                    const name = e.target.value
                    const auto =
                      !draft.slug || draft.slug === slugify(draft.businessName)
                    patch({
                      businessName: name,
                      slug: auto ? slugify(name) : draft.slug,
                    })
                  }}
                />
              </Field>
              <Field label="Owner name *">
                <input
                  className={fieldClass}
                  placeholder="Riya Sharma"
                  value={draft.ownerName}
                  onChange={(e) => patch({ ownerName: e.target.value })}
                />
              </Field>
              <Field label="Store URL slug *" hint="Used to generate your unique store menu URL.">
                <div className="mt-1.5 flex overflow-hidden rounded-lg border border-[#E2E8F0] focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/20">
                  <span className="flex shrink-0 items-center bg-[#F8FAFC] px-3 text-xs text-[#64748B]">
                    {BRAND_DOMAIN}/r/
                  </span>
                  <input
                    className="h-11 min-w-0 flex-1 border-0 bg-white px-3 text-sm outline-none"
                    value={draft.slug}
                    onChange={(e) => patch({ slug: slugify(e.target.value) })}
                    placeholder="caseys-cupcakes"
                  />
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country *">
                  <select
                    className={fieldClass}
                    value={draft.country}
                    onChange={(e) => patch({ country: e.target.value })}
                  >
                    <option>India</option>
                    <option>United Arab Emirates</option>
                    <option>Singapore</option>
                    <option>United Kingdom</option>
                  </select>
                </Field>
                <Field label="Currency *">
                  <select
                    className={fieldClass}
                    value={draft.currency}
                    onChange={(e) => patch({ currency: e.target.value })}
                  >
                    <option value="INR">INR (₹) — Indian Rupee</option>
                    <option value="AED">AED — Dirham</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                    <option value="GBP">GBP — Pound Sterling</option>
                  </select>
                </Field>
              </div>
              <div>
                <span className="text-sm font-semibold text-[#334155]">Industry *</span>
                <p className="mt-1 text-xs text-[#64748B]">
                  What kind of venue is this? Used for onboarding defaults and reporting.
                </p>
                <div className="mt-2">
                  <IndustryPicker
                    value={draft.industryId}
                    onChange={(id) => patch({ industryId: id })}
                  />
                </div>
              </div>
              <Field label="Business description (optional)" hint="Shown on your public menu.">
                <textarea
                  className={cn(fieldClass, 'h-24 resize-none py-2.5')}
                  placeholder="A little about your restaurant..."
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F172A]">
              Contact details
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">How can customers reach you?</p>
            <div className="mt-6 space-y-4">
              <Field
                label="Owner email"
                hint="Defaults to your signup email if left blank."
              >
                <input
                  type="email"
                  className={fieldClass}
                  placeholder="hello@store.com"
                  value={draft.publicEmail}
                  onChange={(e) => patch({ publicEmail: e.target.value })}
                />
              </Field>
              <Field label="Phone number *">
                <div className="mt-1.5 flex gap-2">
                  <span className="flex h-11 shrink-0 items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#334155]">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className={cn(fieldClass, 'mt-0 flex-1')}
                    placeholder="9876543210"
                    value={draft.phone}
                    onChange={(e) =>
                      patch({ phone: e.target.value.replace(/[^\d\s]/g, '').slice(0, 14) })
                    }
                  />
                </div>
              </Field>
              <Field label="WhatsApp number (optional)">
                <div className="mt-1.5 flex gap-2">
                  <span className="flex h-11 shrink-0 items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#334155]">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className={cn(fieldClass, 'mt-0 flex-1')}
                    placeholder="9876543210"
                    value={draft.whatsapp}
                    onChange={(e) =>
                      patch({ whatsapp: e.target.value.replace(/[^\d\s]/g, '').slice(0, 14) })
                    }
                  />
                </div>
              </Field>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F172A]">
              Store location
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">Where is your restaurant located?</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Store address">
                <input
                  className={fieldClass}
                  placeholder="123 Main St, City..."
                  value={draft.address}
                  onChange={(e) => patch({ address: e.target.value })}
                />
              </Field>
              <Field label="City">
                <input
                  className={fieldClass}
                  placeholder="Chennai"
                  value={draft.city}
                  onChange={(e) => patch({ city: e.target.value })}
                />
              </Field>
              <Field label="Google Maps link">
                <input
                  className={fieldClass}
                  placeholder="https://maps.app.goo.gl/..."
                  value={draft.mapsLink}
                  onChange={(e) => patch({ mapsLink: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <UploadBox
                label="Store logo"
                preview={draft.logoDataUrl}
                onPick={() => logoInput.current?.click()}
                onClear={() => patch({ logoDataUrl: undefined })}
              />
              <UploadBox
                label="Cover image"
                preview={draft.coverDataUrl}
                onPick={() => coverInput.current?.click()}
                onClear={() => patch({ coverDataUrl: undefined })}
              />
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) readFile(f, 'logoDataUrl')
                  e.target.value = ''
                }}
              />
              <input
                ref={coverInput}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) readFile(f, 'coverDataUrl')
                  e.target.value = ''
                }}
              />
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[#0F172A]">
              Choose your plan
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Select a plan to unlock features. You can upgrade anytime.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {ONBOARDING_PLANS.map((plan) => {
                const selected = draft.planId === plan.id
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => patch({ planId: plan.id })}
                    className={cn(
                      'relative flex flex-col rounded-xl border bg-white p-5 text-left transition-shadow',
                      selected
                        ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/20 shadow-[0_8px_24px_-12px_rgba(59,130,246,0.45)]'
                        : 'border-[#E2E8F0] hover:border-[#CBD5E1]',
                    )}
                  >
                    {plan.saveLabel && (
                      <span className="absolute right-3 top-3 rounded-full bg-[#22C55E] px-2 py-0.5 text-[10px] font-bold text-white">
                        {plan.saveLabel}
                      </span>
                    )}
                    <p className="font-marketing text-lg font-bold text-[#0F172A]">{plan.name}</p>
                    <p className="mt-2 pr-14 font-marketing text-2xl font-extrabold text-[#0F172A]">
                      {plan.priceYear === 0 ? (
                        <>
                          ₹0
                          <span className="text-sm font-medium text-[#64748B]"> / year</span>
                        </>
                      ) : (
                        <>
                          ₹{plan.priceYear.toLocaleString('en-IN')}
                          <span className="text-sm font-medium text-[#64748B]"> / year</span>
                        </>
                      )}
                    </p>
                    {plan.strikeYear != null && (
                      <p className="mt-0.5 text-xs text-[#94A3B8]">
                        <span className="line-through">
                          ₹{plan.strikeYear.toLocaleString('en-IN')}
                        </span>{' '}
                        if billed monthly
                      </p>
                    )}
                    {plan.blurb && (
                      <p className="mt-3 text-sm leading-relaxed text-[#64748B]">{plan.blurb}</p>
                    )}
                    <ul className="mt-4 flex-1 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex gap-2 text-sm text-[#334155]">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#3B82F6]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <span
                      className={cn(
                        'mt-5 inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold',
                        selected ? 'bg-[#3B82F6] text-white' : 'bg-[#F1F5F9] text-[#334155]',
                      )}
                    >
                      {selected ? 'Selected' : 'Choose plan'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-[#F1F5F9] pt-6">
          {step > 0 ? (
            <button
              type="button"
              onClick={prev}
              disabled={saving}
              className="text-sm font-semibold text-[#64748B] hover:text-[#0F172A] disabled:opacity-50"
            >
              &lt; Previous
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => (step === 3 ? finish() : next())}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#3B82F6] px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === 3 ? (saving ? 'Creating…' : 'Finish setup') : 'Next >'}
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-[#94A3B8]">
        Setting up on {BRAND_NAME} · you can change these details later in Store profile
      </p>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#334155]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[#94A3B8]">{hint}</span>}
    </label>
  )
}

function UploadBox({
  label,
  preview,
  onPick,
  onClear,
}: {
  label: string
  preview?: string
  onPick: () => void
  onClear: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#334155]">{label}</p>
        {preview && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-[#64748B] hover:text-red-500"
          >
            Remove
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onPick}
        className="mt-1.5 flex min-h-[140px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-center transition-colors hover:border-[#94A3B8] hover:bg-[#F1F5F9]"
      >
        {preview ? (
          <img src={preview} alt="" className="max-h-24 rounded-lg object-contain" />
        ) : (
          <>
            <CloudUpload className="h-8 w-8 text-[#94A3B8]" />
            <p className="mt-2 text-sm font-medium text-[#334155]">Click to upload</p>
            <p className="mt-1 text-xs text-[#94A3B8]">SVG, PNG, JPG or GIF (max. 10MB)</p>
          </>
        )}
      </button>
    </div>
  )
}
