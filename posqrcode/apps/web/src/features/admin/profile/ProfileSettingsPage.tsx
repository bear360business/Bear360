import { useState } from 'react'
import { Check, CloudUpload } from 'lucide-react'
import { toast } from 'sonner'
import { IndustryPicker } from '@/components/app/IndustryPicker'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { BRAND_DOMAIN } from '@/lib/brand'
import { useCurrentVenue, useRestaurants } from '@/hooks/use-restaurants'
import { useServiceConfig } from '@/hooks/use-service-config'
import { notifyVenueIndustryChanged } from '@/hooks/use-tenant'
import { getIndustryProfile } from '@/lib/industries-catalog'
import type { IndustryId } from '@/lib/industries'
import { slugifyVenue } from '@/lib/mock'

/** Public-facing venue profile — menu card details & branding. */
export function ProfileSettingsPage() {
  const venue = useCurrentVenue()
  const { update } = useRestaurants()
  const { applyIndustryDefaults } = useServiceConfig()
  const [industryId, setIndustryId] = useState<IndustryId>(venue.industryId ?? 'restaurants')
  const [form, setForm] = useState({
    name: venue.name,
    slug: venue.slug,
    description: venue.cuisine ?? '',
    country: venue.country || 'India',
    currency: venue.currency || 'INR',
    address: venue.address ?? '',
    mapsLink: venue.mapsLink ?? '',
    email: venue.ownerEmail,
    showEmail: venue.showEmail !== false,
    phone: venue.phone,
    whatsapp: venue.whatsapp || venue.phone,
    instagram: venue.instagram ?? '',
    facebook: venue.facebook ?? '',
    youtube: venue.youtube ?? '',
    website: venue.website ?? '',
    logo: venue.logoImage,
    cover: venue.coverImage,
    logoOnReceipt: venue.logoOnReceipt !== false,
  })

  const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }))

  const save = () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required')
      return
    }
    const industryChanged = industryId !== venue.industryId
    update(venue.id, {
      name: form.name.trim(),
      slug: slugifyVenue(form.slug),
      cuisine: form.description.trim(),
      currency: form.currency,
      country: form.country,
      address: form.address.trim(),
      mapsLink: form.mapsLink.trim() || undefined,
      ownerEmail: form.email.trim(),
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim() || form.phone.trim(),
      showEmail: form.showEmail,
      logoOnReceipt: form.logoOnReceipt,
      instagram: form.instagram.trim() || undefined,
      facebook: form.facebook.trim() || undefined,
      youtube: form.youtube.trim() || undefined,
      website: form.website.trim() || undefined,
      logoImage: form.logo,
      coverImage: form.cover,
      industryId,
    })
    if (industryChanged) {
      applyIndustryDefaults(industryId)
      notifyVenueIndustryChanged()
      toast.success(`Industry set to ${getIndustryProfile(industryId).name}`, {
        description: 'Service defaults and modules updated from the industry pack.',
      })
    } else {
      toast.success('Store profile saved')
    }
  }

  return (
    <>
      <PageHeader
        title="Store profile"
        caption="Details shown on your public digital menu."
        actions={
          <Button type="button" className="rounded-full" onClick={save}>
            <Check className="h-4 w-4" />
            Save Changes
          </Button>
        }
      />

      <div className="space-y-8">
        <Section
          title="Basic details"
          caption="These details appear on the public menu."
        >
          <Field label="Restaurant name">
            <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <div className="space-y-2">
            <Label>Industry</Label>
            <p className="text-xs text-muted-foreground">
              Venue type — restaurants, hotels, cloud kitchens, and more.
            </p>
            <IndustryPicker value={industryId} onChange={setIndustryId} />
          </div>
          <Field label="Menu URL slug">
            <div className="flex overflow-hidden rounded-lg border border-line focus-within:ring-2 focus-within:ring-brand/30">
              <span className="flex items-center bg-surface-muted px-3 text-xs text-muted-foreground">
                {BRAND_DOMAIN}/r/
              </span>
              <Input
                className="border-0 shadow-none focus-visible:ring-0"
                value={form.slug}
                onChange={(e) => patch({ slug: e.target.value })}
              />
              <span className="flex items-center px-3 text-success">
                <Check className="h-4 w-4" />
              </span>
            </div>
          </Field>
          <Field label="Business description">
            <Textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={3}
            />
          </Field>
        </Section>

        <Section
          title="Location & region"
          caption="Physical location and currency for bills."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country">
              <Select value={form.country} onValueChange={(v) => patch({ country: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="UAE">United Arab Emirates</SelectItem>
                  <SelectItem value="Singapore">Singapore</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Currency">
              <Select value={form.currency} onValueChange={(v) => patch({ currency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹) — Indian Rupee</SelectItem>
                  <SelectItem value="AED">AED — Dirham</SelectItem>
                  <SelectItem value="SGD">SGD</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Full address">
            <Input
              value={form.address}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </Field>
          <Field label="Google Maps direction link (optional)">
            <Input
              value={form.mapsLink}
              onChange={(e) => patch({ mapsLink: e.target.value })}
              placeholder="https://maps.app.goo.gl/..."
            />
          </Field>
        </Section>

        <Section
          title="Contact information"
          caption="How customers can reach you."
        >
          <Field label="Public email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => patch({ email: e.target.value })}
            />
          </Field>
          <div className="flex items-center justify-between py-1">
            <Label>Show email on menu card</Label>
            <Switch
              checked={form.showEmail}
              onCheckedChange={(v) => patch({ showEmail: v })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone number">
              <Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
            <Field label="WhatsApp order number">
              <Input
                value={form.whatsapp}
                onChange={(e) => patch({ whatsapp: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instagram">
              <Input
                value={form.instagram}
                onChange={(e) => patch({ instagram: e.target.value })}
                placeholder="https://instagram.com/..."
              />
            </Field>
            <Field label="Facebook">
              <Input
                value={form.facebook}
                onChange={(e) => patch({ facebook: e.target.value })}
              />
            </Field>
            <Field label="YouTube">
              <Input
                value={form.youtube}
                onChange={(e) => patch({ youtube: e.target.value })}
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.website}
                onChange={(e) => patch({ website: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Branding & images"
          caption="Personalize how your menu looks."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Upload
              label="Logo image"
              value={form.logo}
              onChange={(logo) => patch({ logo })}
            />
            <Upload
              label="Cover image"
              value={form.cover}
              onChange={(cover) => patch({ cover })}
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Label>Use logo in printed receipts</Label>
            <Switch
              checked={form.logoOnReceipt}
              onCheckedChange={(v) => patch({ logoOnReceipt: v })}
            />
          </div>
        </Section>
      </div>
    </>
  )
}

function Section({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_1fr] lg:gap-8">
      <div>
        <h2 className="font-display text-base font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      </div>
      <Card className="rounded-card border-line shadow-card">
        <CardContent className="space-y-4 p-5">{children}</CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

function Upload({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="space-y-3">
        <label className="group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface-muted/30 px-4 py-6 text-center transition-colors hover:border-brand hover:bg-brand-tint/20">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const result = String(reader.result)
                onChange(result)
                toast.success(`${label} uploaded`)
              }
              reader.readAsDataURL(file)
              e.target.value = ''
            }}
          />
          {value ? (
            <div className="relative flex flex-col items-center gap-2">
              <img src={value} alt="" className="max-h-24 max-w-full rounded-lg object-contain shadow-sm" />
              <p className="text-[11px] font-medium text-muted-foreground group-hover:text-brand">
                Click to replace file from device
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <CloudUpload className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-brand" />
              <p className="text-xs font-semibold text-foreground">Click to upload image file</p>
              <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP or SVG file</p>
            </div>
          )}
        </label>

        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste image URL (https://…)"
            className="text-xs"
          />
          {value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 text-xs text-destructive hover:text-destructive"
              onClick={() => onChange('')}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
