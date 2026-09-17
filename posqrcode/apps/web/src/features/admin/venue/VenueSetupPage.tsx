import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
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
import { useIndustryProfile } from '@/hooks/use-industry-copy'
import { useServiceConfig } from '@/hooks/use-service-config'
import { useVenueOps } from '@/hooks/use-venue-ops'
import { GUEST_LOCALES, LOCALE_META, type GuestLocale } from '@/lib/i18n'
import { getCounterQrUrl, getCurrentRestaurantId } from '@/lib/mock'

/** Operational store setup — fulfillment, payments, tax, checkout. */
export function VenueSetupPage() {
  const { ops, patch, setFulfillment, service } = useVenueOps()
  const { setDeliveryFee, setCounterOrdering, enabledOrderTypes } = useServiceConfig()
  const industry = useIndustryProfile()
  const showRoomService =
    industry.id === 'hotels' || industry.id === 'resorts'
  const counterUrl = getCounterQrUrl(getCurrentRestaurantId())
  const hasCounterTypes =
    enabledOrderTypes.includes('takeaway') || enabledOrderTypes.includes('delivery')

  return (
    <>
      <PageHeader
        title="Ordering & checkout"
        caption="These settings drive the guest QR menu and cart — changes apply instantly."
        actions={
          <Button
            type="button"
            className="rounded-full"
            onClick={() =>
              toast.success('Ordering settings are live', {
                description: 'Guest menu and cart already use the latest values.',
              })
            }
          >
            Save Changes
          </Button>
        }
      />

      <div className="space-y-6">
        <Section
          title="Order fulfillment"
          caption="Which order types your QR menu and POS accept."
        >
          <Toggle
            label="Dine-in orders"
            hint="Allow customers to order from tables (table QR)."
            checked={service.orderTypes['dine-in']}
            onChange={(v) => setFulfillment('dine-in', v)}
          />
          <Toggle
            label="Pickup & takeaway"
            hint="Counter / takeaway orders without a table."
            checked={service.orderTypes.takeaway}
            onChange={(v) => setFulfillment('takeaway', v)}
          />
          {(service.orderTypes.takeaway || service.orderTypes.delivery) && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
              <div>
                <p className="text-sm font-medium">Parcel / packaging charge</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Added on takeaway and delivery bills.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min={0}
                  className="h-9 w-28"
                  value={ops.parcelCharge}
                  onChange={(e) => patch({ parcelCharge: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
          <Toggle
            label="Home delivery"
            hint="Guests enter a delivery address at checkout."
            checked={service.orderTypes.delivery}
            onChange={(v) => setFulfillment('delivery', v)}
          />
          {service.orderTypes.delivery && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
              <div>
                <p className="text-sm font-medium">Delivery fee</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Flat fee on delivery orders (before tax).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min={0}
                  className="h-9 w-28"
                  value={service.deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          )}
          <Toggle
            label="WhatsApp checkout (Beta)"
            hint="Guest CTA opens WhatsApp with the order summary and still creates a kitchen ticket."
            checked={ops.whatsappCheckout}
            onChange={(v) => patch({ whatsappCheckout: v })}
          />
          {showRoomService && (
            <Toggle
              label="Room service"
              hint="For hotels — table/room QR orders are labelled as room service on tickets."
              checked={ops.roomService}
              onChange={(v) => patch({ roomService: v })}
            />
          )}
        </Section>

        <Section
          title="How guests order"
          caption="Table QR = dine-in at a seat. Counter QR = takeaway / delivery without a table."
        >
          <div className="space-y-3 py-1">
            <div className="rounded-xl border border-line bg-surface-muted/50 px-4 py-3">
              <p className="text-sm font-semibold">Table QR (floor)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Print from Tables → each table. Default is dine-in; guests can still switch to
                takeaway/delivery at checkout (pickup is not billed to the table).
              </p>
              <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
                <Link to="/tables">Manage table QRs →</Link>
              </Button>
            </div>
            <Toggle
              label="Counter QR (no table)"
              hint={
                hasCounterTypes
                  ? 'Walk-ins scan one code at the counter for takeaway or delivery.'
                  : 'Turn on Pickup or Delivery above first — then the counter QR unlocks.'
              }
              checked={service.counterOrdering}
              onChange={(v) => {
                if (v && !hasCounterTypes) {
                  toast.error('Enable Pickup or Delivery first')
                  return
                }
                setCounterOrdering(v)
              }}
            />
            {service.counterOrdering && hasCounterTypes && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Counter link</p>
                  <p className="truncate font-mono text-xs text-foreground">
                    {counterUrl.replace(/^https?:\/\//, '')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    navigator.clipboard?.writeText(counterUrl)
                    toast.success('Counter link copied')
                  }}
                >
                  Copy
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" asChild>
                  <a href={counterUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </Button>
                <Button size="sm" className="rounded-full" asChild>
                  <Link to="/tables">Show QR on Tables</Link>
                </Button>
              </div>
            )}
          </div>
        </Section>

        <Section title="Payment options" caption="How guests settle at QR checkout.">
          <Toggle
            label="Online payments (UPI / Cards)"
            hint="Demo mode — guests can pick “Pay online”; no real charge."
            checked={ops.onlinePayments}
            onChange={(v) => patch({ onlinePayments: v })}
          />
          <Toggle
            label="Pay at counter / cash"
            hint="Guest pays when the order is served or collected."
            checked={ops.cashOnDelivery}
            onChange={(v) => patch({ cashOnDelivery: v })}
          />
          {ops.cashOnDelivery && (
            <div className="flex flex-wrap gap-4 py-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ops.cashDineIn}
                  onChange={(e) => patch({ cashDineIn: e.target.checked })}
                />
                Allow for dine-in
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ops.cashPickup}
                  onChange={(e) => patch({ cashPickup: e.target.checked })}
                />
                Allow for pickup / takeaway
              </label>
            </div>
          )}
          {!ops.onlinePayments && !ops.cashOnDelivery && (
            <p className="py-2 text-xs text-warning">
              Turn on at least one payment option or guests cannot complete checkout.
            </p>
          )}
        </Section>

        <Section title="Tax & GST" caption="Apply tax on the order subtotal.">
          <Toggle
            label="Enable tax collection"
            hint="Uses your venue GST rate from Store profile / Settings."
            checked={ops.taxEnabled}
            onChange={(v) => patch({ taxEnabled: v })}
          />
        </Section>

        <Section title="Checkout form" caption="What guests must enter before ordering.">
          <FieldSelect
            label="Customer name"
            value={ops.customerName}
            onChange={(v) => patch({ customerName: v })}
          />
          <FieldSelect
            label="Customer phone number"
            value={ops.customerPhone}
            onChange={(v) => patch({ customerPhone: v })}
          />
          <Toggle
            label="Enable special instructions note"
            checked={ops.specialInstructions}
            onChange={(v) => patch({ specialInstructions: v })}
          />
        </Section>

        <Section
          title="Guest language"
          caption="Languages offered on the QR menu. Guests can switch among the ones you enable."
        >
          {GUEST_LOCALES.map((code) => {
            const on = ops.enabledLocales.includes(code)
            const onlyOne = ops.enabledLocales.length === 1 && on
            return (
              <Toggle
                key={code}
                label={`${LOCALE_META[code].label} (${LOCALE_META[code].nativeLabel})`}
                hint={
                  code === 'en'
                    ? 'Always recommended as a fallback.'
                    : `Show ${LOCALE_META[code].nativeLabel} in the guest language switcher.`
                }
                checked={on}
                onChange={(v) => {
                  if (!v && onlyOne) {
                    toast.error('Keep at least one language enabled')
                    return
                  }
                  const enabledLocales = (
                    v
                      ? [...ops.enabledLocales, code]
                      : ops.enabledLocales.filter((l) => l !== code)
                  ) as GuestLocale[]
                  const unique = GUEST_LOCALES.filter((l) => enabledLocales.includes(l))
                  patch({
                    enabledLocales: unique,
                    defaultLocale: unique.includes(ops.defaultLocale)
                      ? ops.defaultLocale
                      : unique[0]!,
                  })
                }}
              />
            )
          })}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">Default language</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Used when a guest has not chosen a language yet.
              </p>
            </div>
            <Select
              value={ops.defaultLocale}
              onValueChange={(v) => patch({ defaultLocale: v as GuestLocale })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ops.enabledLocales.map((code) => (
                  <SelectItem key={code} value={code}>
                    {LOCALE_META[code].nativeLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Section title="Advanced settings" caption="Catalogue and login behaviour.">
          <Toggle
            label="Catalogue mode (hide prices)"
            hint="Browse-only menu — no add to cart or prices on the guest app."
            checked={ops.catalogueMode}
            onChange={(v) => patch({ catalogueMode: v })}
          />
          <Toggle
            label="Customer login at checkout"
            hint="Requires a phone number before the order can be placed."
            checked={ops.customerLogin}
            onChange={(v) => patch({ customerLogin: v })}
          />
        </Section>

        <Card className="rounded-card border-warning/40 bg-warning-tint/30 shadow-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold text-foreground">Web App (PWA) settings</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Installable guest app is available on Professional and Enterprise plans.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-warning text-warning"
              asChild
            >
              <Link to="/billing">Upgrade Plan</Link>
            </Button>
          </CardContent>
        </Card>
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
  children: ReactNode
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_1fr] lg:gap-8">
      <div>
        <h2 className="font-display text-base font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      </div>
      <Card className="rounded-card border-line shadow-card">
        <CardContent className="divide-y divide-line p-4 sm:p-5">{children}</CardContent>
      </Card>
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: 'required' | 'optional' | 'hidden'
  onChange: (v: 'required' | 'optional' | 'hidden') => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as typeof value)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="required">Required</SelectItem>
          <SelectItem value="optional">Optional</SelectItem>
          <SelectItem value="hidden">Hidden</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
