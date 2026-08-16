import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, CloudUpload } from 'lucide-react'
import { IndustryPicker } from '@/components/app/IndustryPicker'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useRestaurants } from '@/hooks/use-restaurants'
import { notifyVenueIndustryChanged } from '@/hooks/use-tenant'
import { DEMO_OWNER_PASSWORD, provisionRestaurantOwner } from '@/lib/auth'
import { BRAND_DOMAIN } from '@/lib/brand'
import { getIndustryProfile } from '@/lib/industries-catalog'
import { applyIndustryDefaultsForVenue } from '@/lib/venue-entitlements'
import type { IndustryId, PlanId } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  ONBOARDING_PLANS,
  ONBOARDING_STEPS,
  slugify,
} from '@/features/admin/onboarding/store-setup'

/** Same steps + labels as restaurant self-serve onboarding, plus Review. */
const STEPS = [...ONBOARDING_STEPS.map((s) => s.label), 'Review'] as const

/** Create/edit store — aligned with /onboarding field names and step order. */
export function CreateRestaurantPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { getById, create, update } = useRestaurants()
  const isEditRoute = Boolean(id)
  const editing = id ? getById(id) : undefined
  const logoInput = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [slug, setSlug] = useState('')
  const [country, setCountry] = useState('India')
  const [currency, setCurrency] = useState('INR')
  const [industryId, setIndustryId] = useState<IndustryId>('restaurants')
  const [description, setDescription] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [mapsLink, setMapsLink] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>()
  const [planId, setPlanId] = useState<PlanId>('basic')
  const [sendInvite, setSendInvite] = useState(true)

  // Hydrate (and re-hydrate) when the edit :id changes.
  useEffect(() => {
    if (!id) {
      setStep(0)
      setError('')
      setBusinessName('')
      setOwnerName('')
      setSlug('')
      setCountry('India')
      setCurrency('INR')
      setIndustryId('restaurants')
      setDescription('')
      setOwnerEmail('')
      setPhone('')
      setWhatsapp('')
      setAddress('')
      setCity('')
      setMapsLink('')
      setLogoDataUrl(undefined)
      setPlanId('basic')
      setSendInvite(true)
      return
    }
    const venue = getById(id)
    if (!venue) return
    setStep(0)
    setError('')
    setBusinessName(venue.name)
    setOwnerName(venue.ownerName)
    setSlug(venue.slug)
    setCountry(venue.country ?? 'India')
    setCurrency(venue.currency ?? 'INR')
    setIndustryId(venue.industryId)
    setDescription(venue.cuisine ?? '')
    setOwnerEmail(venue.ownerEmail)
    setPhone(venue.phone?.replace(/^\+91\s*/, '') ?? '')
    setWhatsapp((venue.whatsapp ?? venue.phone ?? '').replace(/^\+91\s*/, ''))
    setAddress(venue.address ?? '')
    setCity(venue.city ?? '')
    setMapsLink(venue.mapsLink ?? '')
    setLogoDataUrl(venue.logoImage)
    setPlanId(venue.planId)
  }, [id, getById])

  if (isEditRoute && !editing) {
    return (
      <>
        <PageHeader
          title="Restaurant not found"
          caption="That edit URL doesn’t match any venue in this browser."
          backHref="/super/restaurants"
          backLabel="Restaurants"
        />
        <Card className="mx-auto max-w-lg rounded-card border-line shadow-card">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No store with id <span className="font-mono text-foreground">{id}</span>.
            </p>
            <Button asChild className="rounded-full font-semibold">
              <Link to="/super/restaurants/create">Create a new store instead</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    )
  }

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!businessName.trim()) {
        setError('Business name is required')
        return false
      }
      if (!ownerName.trim()) {
        setError('Owner name is required')
        return false
      }
      if (!slug.trim()) {
        setError('Store URL slug is required')
        return false
      }
    }
    if (step === 1) {
      if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
        setError('Owner email is required')
        return false
      }
      const digits = phone.replace(/\D/g, '')
      if (digits.length === 0) {
        setError('Phone number is required')
        return false
      }
      if (digits.length < 10) {
        setError('Enter a valid 10-digit phone number')
        return false
      }
    }
    setError('')
    return true
  }

  const onContinue = () => {
    if (!validateStep()) return
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }

    const pack = getIndustryProfile(industryId)
    const phoneDigits = phone.replace(/\D/g, '')
    const waDigits = whatsapp.replace(/\D/g, '') || phoneDigits
    const phoneFormatted = phoneDigits ? `+91 ${phoneDigits.slice(-10)}` : undefined
    const waFormatted = waDigits ? `+91 ${waDigits.slice(-10)}` : undefined

    void (async () => {
      try {
        if (editing) {
          await update(editing.id, {
            name: businessName.trim() || editing.name,
            slug: slug.trim() || editing.slug,
            ownerName: ownerName.trim(),
            ownerEmail: ownerEmail.trim(),
            phone: phoneFormatted || editing.phone,
            whatsapp: waFormatted,
            mapsLink: mapsLink.trim() || undefined,
            country,
            city: city.trim(),
            address: address.trim() || undefined,
            cuisine: description.trim() || editing.cuisine,
            industryId,
            planId,
            currency,
            logoImage: logoDataUrl || editing.logoImage,
          })
          applyIndustryDefaultsForVenue(editing.id, industryId)
          notifyVenueIndustryChanged()
          const provision = provisionRestaurantOwner(ownerEmail.trim(), editing.id)
          toast.success(`${businessName.trim()} updated`, {
            description: provision.ok
              ? `Industry: ${pack.name} · owner login ready (${ownerEmail.trim()})`
              : `Industry: ${pack.name}`,
          })
        } else {
          const venue = await create({
            name: businessName.trim(),
            slug: slug.trim() || undefined,
            ownerName: ownerName.trim(),
            ownerEmail: ownerEmail.trim(),
            phone: phoneFormatted,
            whatsapp: waFormatted,
            mapsLink: mapsLink.trim() || undefined,
            country,
            city: city.trim() || undefined,
            address: address.trim() || undefined,
            cuisine: description.trim() || undefined,
            industryId,
            planId,
            currency,
            logoImage: logoDataUrl,
          })
          applyIndustryDefaultsForVenue(venue.id, industryId)
          if (sendInvite) {
            const provision = provisionRestaurantOwner(venue.ownerEmail, venue.id)
            toast.success(`${venue.name} created`, {
              description: provision.ok
                ? `Owner login ready · ${venue.ownerEmail} / ${DEMO_OWNER_PASSWORD}`
                : `${pack.name}. Owner login skipped: ${provision.error}`,
            })
          } else {
            toast.success(`${venue.name} created`, {
              description: `Saved with ${pack.name}. No owner login provisioned.`,
            })
          }
        }
        navigate('/super/restaurants')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save restaurant')
      }
    })()
  }

  const review: { label: string; value: string }[] = [
    { label: 'Business name', value: businessName || '—' },
    { label: 'Owner name', value: ownerName || '—' },
    { label: 'Store URL slug', value: `${BRAND_DOMAIN}/r/${slug || '—'}` },
    { label: 'Industry', value: getIndustryProfile(industryId).name },
    { label: 'Country', value: country },
    { label: 'Currency', value: currency },
    { label: 'Owner email', value: ownerEmail || '—' },
    { label: 'Phone number', value: phone || '—' },
    { label: 'WhatsApp number', value: whatsapp || '—' },
    { label: 'Store address', value: address || '—' },
    { label: 'City', value: city || '—' },
    { label: 'Maps link', value: mapsLink || '—' },
    {
      label: 'Plan',
      value: ONBOARDING_PLANS.find((p) => p.id === planId)?.name ?? planId,
    },
  ]

  return (
    <>
      <PageHeader
        title={editing ? `Edit ${editing.name}` : 'Create store'}
        caption={
          editing
            ? 'Update business details using the same fields as store onboarding.'
            : 'Same steps as self-serve onboarding — creates an owner login (demo1234).'
        }
        backHref="/super/restaurants"
        backLabel="Restaurants"
      />

      <ol className="mb-6 flex max-w-3xl items-center justify-between">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={label} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2',
                    i <= step ? 'bg-success' : 'bg-line',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-[1] flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                  done || active
                    ? 'bg-brand text-brand-foreground'
                    : 'border border-line bg-surface text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'mt-2 text-center text-[10px] font-bold uppercase tracking-[0.12em]',
                  active || done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>

      <Card className="mx-auto max-w-[720px] rounded-card border-line shadow-card">
        <CardContent className="p-8">
          {step === 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                  Business information
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Provide the necessary details to register your business with us.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-name">Business name *</Label>
                <Input
                  id="business-name"
                  placeholder="e.g. Casey's Cupcakes"
                  value={businessName}
                  onChange={(e) => {
                    const name = e.target.value
                    const auto = !slug || slug === slugify(businessName)
                    setBusinessName(name)
                    if (auto) setSlug(slugify(name))
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-name">Owner name *</Label>
                <Input
                  id="owner-name"
                  placeholder="Riya Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Store URL slug *</Label>
                <div className="flex overflow-hidden rounded-lg border border-line focus-within:ring-2 focus-within:ring-brand/30">
                  <span className="flex shrink-0 items-center bg-surface-muted px-3 text-xs text-muted-foreground">
                    {BRAND_DOMAIN}/r/
                  </span>
                  <Input
                    id="slug"
                    className="border-0 shadow-none focus-visible:ring-0"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="caseys-cupcakes"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to generate your unique store menu URL.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <select
                    id="country"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    <option>India</option>
                    <option>United Arab Emirates</option>
                    <option>Singapore</option>
                    <option>United Kingdom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <select
                    id="currency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="INR">INR (₹) — Indian Rupee</option>
                    <option value="AED">AED — Dirham</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                    <option value="GBP">GBP — Pound Sterling</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Industry *</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    What kind of venue is this? Used for onboarding defaults and reporting.
                  </p>
                </div>
                <IndustryPicker value={industryId} onChange={setIndustryId} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Business description (optional)</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="A little about your restaurant..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Shown on your public menu.</p>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                  Contact details
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">How can customers reach you?</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-email">Owner email *</Label>
                <Input
                  id="owner-email"
                  type="email"
                  placeholder="hello@store.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number *</Label>
                <div className="flex gap-2">
                  <span className="flex h-10 shrink-0 items-center rounded-md border border-line bg-surface-muted px-3 text-sm text-muted-foreground">
                    🇮🇳 +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/[^\d\s+-]/g, '').slice(0, 14))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp number (optional)</Label>
                <div className="flex gap-2">
                  <span className="flex h-10 shrink-0 items-center rounded-md border border-line bg-surface-muted px-3 text-sm text-muted-foreground">
                    🇮🇳 +91
                  </span>
                  <Input
                    id="whatsapp"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={whatsapp}
                    onChange={(e) =>
                      setWhatsapp(e.target.value.replace(/[^\d\s+-]/g, '').slice(0, 14))
                    }
                  />
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                  Store location
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Where is your restaurant located?
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Store address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Chennai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maps">Google Maps link</Label>
                  <Input
                    id="maps"
                    placeholder="https://maps.app.goo.gl/..."
                    value={mapsLink}
                    onChange={(e) => setMapsLink(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Store logo</Label>
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
                >
                  {logoDataUrl ? (
                    <img
                      src={logoDataUrl}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <CloudUpload className="h-6 w-6" />
                  )}
                  <span className="text-xs font-medium">
                    {logoDataUrl ? 'Change logo' : 'PNG/JPG — tap to upload'}
                  </span>
                </button>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => setLogoDataUrl(String(reader.result))
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }}
                />
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                  Choose your plan
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select a plan to unlock features. You can upgrade anytime.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {ONBOARDING_PLANS.map((plan) => {
                  const selected = planId === plan.id
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanId(plan.id)}
                      className={cn(
                        'relative flex flex-col rounded-2xl border-2 p-4 text-left transition-colors',
                        selected
                          ? 'border-brand bg-brand-tint'
                          : 'border-line bg-surface hover:border-ink-900/20',
                      )}
                    >
                      {selected && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                          <Check className="h-3 w-3 text-ink-900" />
                        </span>
                      )}
                      {plan.saveLabel && (
                        <span className="mb-2 w-fit rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white">
                          {plan.saveLabel}
                        </span>
                      )}
                      <p className="text-sm font-bold">{plan.name}</p>
                      <p className="mt-1 font-display text-xl font-bold">
                        {plan.priceYear === 0
                          ? '₹0'
                          : `₹${plan.priceYear.toLocaleString('en-IN')}`}
                        <span className="text-xs font-normal text-muted-foreground"> / year</span>
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.slice(0, 4).map((f) => (
                          <li key={f} className="flex gap-1.5 text-xs text-foreground">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                Review
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirm details before {editing ? 'saving' : 'creating the store'}.
              </p>
              <ul className="mt-4 divide-y divide-line">
                {review.map((row) => (
                  <li key={row.label} className="flex min-h-10 items-center justify-between gap-4 py-2">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-right text-sm font-medium text-foreground">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
              {!editing && (
                <label className="mt-6 flex items-center justify-between rounded-xl border border-line px-4 py-3">
                  <span className="text-sm font-medium">
                    Provision owner login ({DEMO_OWNER_PASSWORD})
                  </span>
                  <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
                </label>
              )}
            </section>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </CardContent>

        <div className="flex items-center justify-between border-t border-line px-8 py-4">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => navigate('/super/restaurants')}
          >
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setError('')
                  setStep(step - 1)
                }}
              >
                ← Previous
              </Button>
            )}
            <Button className="rounded-full font-semibold" onClick={onContinue}>
              {step === STEPS.length - 1
                ? editing
                  ? 'Save changes'
                  : 'Create store'
                : 'Next →'}
            </Button>
          </div>
        </div>
      </Card>
    </>
  )
}
