import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Moon,
  Palette,
  QrCode,
  RotateCcw,
  Store,
  Sun,
} from 'lucide-react'
import { ColorPicker } from '@/components/app/ColorPicker'
import { useAppearance } from '@/hooks/use-appearance'
import { useCurrentVenue, useRestaurants } from '@/hooks/use-restaurants'
import { useServiceConfig } from '@/hooks/use-service-config'
import {
  CHROME_FALLBACKS,
  FONT_STYLES,
  NAV_LAYOUTS,
  THEMES,
  type Mode,
  type NavLayout,
  type SidebarStyle,
} from '@/lib/appearance'
import { isLightHex } from '@/lib/color'
import { ORDER_TYPE_META, tableFreeOrderTypes } from '@/lib/service-config'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/app/PageHeader'
import { SideMenuControl } from '@/features/admin/settings/SideMenuControl'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { currentRestaurantId, getCounterQrUrl, getPlanById } from '@/lib/mock'
import { RESTAURANT_GST_RATES } from '@/lib/tax'

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const NOTIF_KEY = 'bearqr:notifications'
/** Kept in sync with KitchenPage CHIME_KEY. */
const CHIME_KEY = 'bearqr:kds-chime'
const DEFAULT_NOTIFS: Record<string, boolean> = {
  'order-sound': true,
  'daily-digest': true,
  'sold-out-alerts': false,
}

const notificationRows = [
  { id: 'order-sound', label: 'New order sound' },
  { id: 'daily-digest', label: 'Daily sales digest email' },
  { id: 'sold-out-alerts', label: 'Sold-out item alerts' },
]

function readNotifs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    return raw ? { ...DEFAULT_NOTIFS, ...JSON.parse(raw) } : { ...DEFAULT_NOTIFS }
  } catch {
    return { ...DEFAULT_NOTIFS }
  }
}

/** Restaurant settings: admin chrome + tax/counter. Profile / ordering / QR / billing live on dedicated pages. */
export function SettingsPage() {
  const { update } = useRestaurants()
  const restaurant = useCurrentVenue()
  const plan = getPlanById(restaurant.planId)
  const [dirty, setDirty] = useState(false)
  const [profileGstRate, setProfileGstRate] = useState(String(restaurant.gstRatePct))
  const [profileGstin, setProfileGstin] = useState(restaurant.gstin ?? '')
  const [profileCurrency, setProfileCurrency] = useState(restaurant.currency.toLowerCase())
  const [isOpen, setIsOpen] = useState(restaurant.isOpen)
  const [opensAt, setOpensAt] = useState(restaurant.opensAt || '11:00')
  const [closesAt, setClosesAt] = useState(restaurant.closesAt || '22:00')
  const [notifs, setNotifs] = useState(readNotifs)
  const { appearance, setAppearance, setChromeColor, setFontStyle, reset } = useAppearance()
  const sidebarFallback =
    appearance.sidebarStyle === 'light'
      ? CHROME_FALLBACKS.sidebarLight
      : CHROME_FALLBACKS.sidebarDark
  const iconsOnLightRail = appearance.colors.sidebar
    ? isLightHex(appearance.colors.sidebar)
    : appearance.sidebarStyle === 'light'
  const iconsFallback = iconsOnLightRail
    ? CHROME_FALLBACKS.iconsLight
    : CHROME_FALLBACKS.iconsDark
  const textFallback =
    appearance.mode === 'dark' ? CHROME_FALLBACKS.textDark : CHROME_FALLBACKS.textLight
  const layoutFallback =
    appearance.mode === 'dark' ? CHROME_FALLBACKS.layoutDark : CHROME_FALLBACKS.layoutLight
  const {
    config: service,
    enabledOrderTypes,
    setCounterOrdering,
    setDeductStockOnPaid,
  } = useServiceConfig()
  const counterUrl = getCounterQrUrl(restaurant.id || currentRestaurantId)
  const counterTypes = tableFreeOrderTypes(enabledOrderTypes)

  const resetFields = () => {
    setProfileGstRate(String(restaurant.gstRatePct))
    setProfileGstin(restaurant.gstin ?? '')
    setProfileCurrency(restaurant.currency.toLowerCase())
    setNotifs(readNotifs())
  }

  const saveSettings = () => {
    update(restaurant.id, {
      gstRatePct: Number(profileGstRate) || restaurant.gstRatePct,
      gstin: profileGstin.trim() || undefined,
      currency: profileCurrency.toUpperCase(),
      isOpen,
      opensAt,
      closesAt,
    })
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs))
      // Kitchen chime follows Settings → New order sound.
      localStorage.setItem(CHIME_KEY, notifs['order-sound'] ? 'on' : 'off')
      window.dispatchEvent(new Event('bearqr:notif-changed'))
    } catch {
      /* ignore */
    }
    toast.success('Settings saved')
    setDirty(false)
  }

  return (
    <>
      <PageHeader
        title="Settings"
        caption="Admin theme, tax, counter QR, and notifications. Store details and ordering live in their own pages."
      />
      <Tabs defaultValue="appearance">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="profile">Store profile</TabsTrigger>
          <TabsTrigger value="service">Tax & counter</TabsTrigger>
          <TabsTrigger value="branding">QR & menu look</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">Theme</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applies instantly across the whole app — saved to this device.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={() => {
                    reset()
                    toast.success('Appearance reset to defaults')
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {THEMES.map((theme) => {
                  const active = appearance.theme === theme.id
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setAppearance({ theme: theme.id })}
                      className={cn(
                        'relative flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-colors',
                        active ? 'border-brand bg-brand-tint' : 'border-line bg-surface hover:border-ink-900/20',
                      )}
                    >
                      {active && (
                        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                          <Check className="h-3 w-3 text-ink-900" />
                        </span>
                      )}
                      <span className="flex gap-1.5">
                        <span
                          className="h-6 w-6 rounded-full border border-line"
                          style={{ backgroundColor: theme.brand }}
                        />
                        <span
                          className="h-6 w-6 rounded-full border border-line"
                          style={{ backgroundColor: theme.ink }}
                        />
                      </span>
                      <span className="mt-2 text-sm font-semibold">{theme.name}</span>
                      <span className="text-[11px] text-muted-foreground">{theme.caption}</span>
                    </button>
                  )
                })}
              </div>

              <div className="my-6 h-px bg-line" />

              <h3 className="text-base font-semibold">Mode</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Light or dark — applied to every screen, including the customer app.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
                {(
                  [
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                  ] as { id: Mode; label: string; icon: typeof Sun }[]
                ).map((mode) => {
                  const active = appearance.mode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAppearance({ mode: mode.id })}
                      className={cn(
                        'relative flex flex-col items-start rounded-2xl border-2 p-3 transition-colors',
                        active ? 'border-brand bg-brand-tint' : 'border-line bg-surface hover:border-ink-900/20',
                      )}
                    >
                      {active && (
                        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                          <Check className="h-3 w-3 text-ink-900" />
                        </span>
                      )}
                      <span
                        className={cn(
                          'flex h-12 w-full items-center justify-center rounded-lg border',
                          mode.id === 'dark'
                            ? 'border-ink-800 bg-ink-900 text-white'
                            : 'border-line bg-white text-ink-900',
                        )}
                      >
                        <mode.icon className="h-5 w-5" />
                      </span>
                      <span className="mt-2 text-sm font-semibold">{mode.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="my-6 h-px bg-line" />

              <h3 className="text-base font-semibold">Navigation layout</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                How the admin portal navigation is arranged.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {NAV_LAYOUTS.map((navLayout) => {
                  const active = appearance.navLayout === navLayout.id
                  return (
                    <button
                      key={navLayout.id}
                      type="button"
                      onClick={() => setAppearance({ navLayout: navLayout.id as NavLayout })}
                      className={cn(
                        'relative flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-colors',
                        active ? 'border-brand bg-brand-tint' : 'border-line bg-surface hover:border-ink-900/20',
                      )}
                    >
                      {active && (
                        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                          <Check className="h-3 w-3 text-ink-900" />
                        </span>
                      )}
                      {/* Mini preview — uses live nav/brand tokens */}
                      <span className="flex h-14 w-full overflow-hidden rounded-lg border border-line bg-surface-muted/40 p-1">
                        {navLayout.id === 'sidebar' && (
                          <>
                            <span className="relative h-full w-1/3 overflow-hidden rounded-sm bg-nav">
                              <span className="absolute inset-x-1 top-1 h-1 rounded-full bg-brand" />
                              <span className="absolute inset-x-1 top-3.5 h-1 rounded-full bg-nav-hover" />
                            </span>
                            <span className="ml-1 h-full flex-1 rounded-sm bg-surface" />
                          </>
                        )}
                        {navLayout.id === 'floating' && (
                          <>
                            <span className="relative my-1 ml-0.5 h-[calc(100%-8px)] w-1/3 overflow-hidden rounded-md bg-nav shadow-raised">
                              <span className="absolute inset-x-1 top-1 h-1 rounded-full bg-brand" />
                            </span>
                            <span className="ml-1.5 h-full flex-1 rounded-sm bg-surface" />
                          </>
                        )}
                        {navLayout.id === 'topbar' && (
                          <span className="flex h-full w-full flex-col gap-1">
                            <span className="flex h-1/3 w-full items-center gap-1 rounded-sm bg-nav px-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                              <span className="h-1 flex-1 rounded-full bg-nav-hover" />
                            </span>
                            <span className="w-full flex-1 rounded-sm bg-surface" />
                          </span>
                        )}
                      </span>
                      <span className="mt-2 text-sm font-semibold">{navLayout.name}</span>
                      <span className="text-[11px] text-muted-foreground">{navLayout.caption}</span>
                    </button>
                  )
                })}
              </div>

              <div className="my-6 h-px bg-line" />

              <h3 className="text-base font-semibold">Sidebar</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Rail style for the admin portals.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
                {(
                  [
                    { id: 'dark', label: 'Dark rail' },
                    { id: 'light', label: 'Light rail' },
                  ] as { id: SidebarStyle; label: string }[]
                ).map((style) => {
                  const active = appearance.sidebarStyle === style.id
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setAppearance({ sidebarStyle: style.id })}
                      className={cn(
                        'relative flex flex-col items-start rounded-2xl border-2 p-3 transition-colors',
                        active ? 'border-brand bg-brand-tint' : 'border-line bg-surface hover:border-ink-900/20',
                      )}
                    >
                      {active && (
                        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                          <Check className="h-3 w-3 text-ink-900" />
                        </span>
                      )}
                      {/* Mini preview: rail uses themed ink / surface */}
                      <span className="flex h-12 w-full overflow-hidden rounded-lg border border-line">
                        <span
                          className={cn(
                            'relative w-1/3 border-r',
                            style.id === 'dark'
                              ? 'border-white/10 bg-ink-900'
                              : 'border-line bg-surface',
                          )}
                        >
                          <span className="absolute inset-x-1 top-2 h-1 rounded-full bg-brand" />
                          <span
                            className={cn(
                              'absolute inset-x-1 top-4 h-1 rounded-full',
                              style.id === 'dark' ? 'bg-white/20' : 'bg-surface-muted',
                            )}
                          />
                        </span>
                        <span className="flex-1 bg-surface-muted/50" />
                      </span>
                      <span className="mt-2 text-sm font-semibold">{style.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="my-6 h-px bg-line" />

              <h3 className="text-base font-semibold">Chrome colours</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick custom colours for chrome, text, and page layout — applies instantly.
              </p>
              <div className="mt-2 divide-y divide-line rounded-xl border border-line px-4">
                <ColorPicker
                  label="Navbar"
                  caption="Top header background"
                  value={appearance.colors.navbar}
                  fallback={
                    appearance.mode === 'dark' ? '#1c1f26' : CHROME_FALLBACKS.navbar
                  }
                  onChange={(hex) => setChromeColor('navbar', hex)}
                />
                <ColorPicker
                  label="Sidebar"
                  caption="Left rail background (auto text contrast)"
                  value={appearance.colors.sidebar}
                  fallback={sidebarFallback}
                  onChange={(hex) => setChromeColor('sidebar', hex)}
                />
                <ColorPicker
                  label="Icons"
                  caption="Sidebar and header icon colour"
                  value={appearance.colors.icons}
                  fallback={iconsFallback}
                  onChange={(hex) => setChromeColor('icons', hex)}
                />
                <ColorPicker
                  label="Text"
                  caption="Body and heading text colour"
                  value={appearance.colors.text}
                  fallback={textFallback}
                  onChange={(hex) => setChromeColor('text', hex)}
                />
                <ColorPicker
                  label="Layout"
                  caption="Main page / content area background"
                  value={appearance.colors.layout}
                  fallback={layoutFallback}
                  onChange={(hex) => setChromeColor('layout', hex)}
                />
              </div>

              <div className="my-6 h-px bg-line" />

              <h3 className="text-base font-semibold">Font style</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                UI typeface for the admin shell — headings follow the same family where needed.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {FONT_STYLES.map((font) => {
                  const active = appearance.fontStyle === font.id
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setFontStyle(font.id)}
                      className={cn(
                        'relative flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-colors',
                        active
                          ? 'border-brand bg-brand-tint'
                          : 'border-line bg-surface hover:border-ink-900/20',
                      )}
                    >
                      {active && (
                        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                          <Check className="h-3 w-3 text-ink-900" />
                        </span>
                      )}
                      <span
                        className="text-2xl font-semibold leading-none tracking-tight"
                        style={{ fontFamily: font.display }}
                      >
                        {font.sample}
                      </span>
                      <span
                        className="mt-2 text-sm font-semibold"
                        style={{ fontFamily: font.sans }}
                      >
                        {font.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{font.caption}</span>
                    </button>
                  )
                })}
              </div>

              <div className="my-6 h-px bg-line" />

              <SideMenuControl />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="flex flex-col gap-5 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={restaurant.logoImage}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover"
                />
                <div>
                  <h3 className="text-base font-semibold">{restaurant.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Name, logo, contacts, industry, and public menu details are edited in Store
                    profile — not duplicated here.
                  </p>
                </div>
              </div>
              <Button asChild className="rounded-full shrink-0">
                <Link to="/profile">
                  Edit store profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="p-8">
              <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-foreground">
                    <Store className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Order types, payments & checkout</p>
                    <p className="text-xs text-muted-foreground">
                      Dine-in, takeaway, parcel fee, tax toggle, and guest fields live in Ordering
                      &amp; checkout.
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" className="rounded-full shrink-0">
                  <Link to="/venue-setup">
                    Open ordering
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="my-6 h-px bg-line" />

              {/* Ordering without a table — counters, kiosks, cloud kitchens. */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">Ordering without a table</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    One counter QR that works with no table at all — for takeaway counters,
                    kiosks and cloud kitchens. Dine-in is never offered on it.
                  </p>
                </div>
                <Switch
                  checked={service.counterOrdering}
                  onCheckedChange={setCounterOrdering}
                  aria-label="Table-free ordering enabled"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-line px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Deduct stock on payment</p>
                  <p className="text-xs text-muted-foreground">
                    Also pull recipe stock when an order is marked paid (not only served/completed).
                    Useful for counter-only venues.
                  </p>
                </div>
                <Switch
                  checked={service.deductStockOnPaid}
                  onCheckedChange={setDeductStockOnPaid}
                  aria-label="Deduct stock on paid"
                />
              </div>

              {service.counterOrdering && (
                <div className="mt-4 rounded-card border border-line bg-surface-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Counter QR
                  </p>
                  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="mx-auto flex h-36 w-36 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm sm:mx-0">
                      <QRCodeSVG value={counterUrl} size={128} level="M" includeMargin={false} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 text-xs">
                          {counterUrl}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard
                              ?.writeText(counterUrl)
                              .then(() => toast.success('Counter QR link copied'))
                              .catch(() => toast.error('Could not copy the link'))
                          }}
                        >
                          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={counterUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toast.success('Counter QR downloaded', {
                              description: 'Print and stick it at the hotel counter.',
                            })
                          }
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" /> Download PNG
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {counterTypes.length > 0 ? (
                          <>
                            Guests scanning this order without a table:{' '}
                            <span className="font-medium text-foreground">
                              {counterTypes
                                .map((t) => ORDER_TYPE_META.find((m) => m.id === t)?.label ?? t)
                                .join(' · ')}
                            </span>
                            . Staff can also take the same orders on POS.
                          </>
                        ) : (
                          <span className="font-medium text-warning">
                            Turn on Takeaway or Delivery in Ordering &amp; checkout — with only
                            dine-in enabled the counter QR has nothing to offer.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="my-6 h-px bg-line" />

              <h3 className="text-base font-semibold">Open for orders</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Controls the guest landing “Open now” state and whether ordering is allowed.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Accepting orders</p>
                  <p className="text-xs text-muted-foreground">
                    {opensAt} – {closesAt} · {weekdays.length} days shown on menu
                  </p>
                </div>
                <Switch
                  checked={isOpen}
                  onCheckedChange={(v) => {
                    setIsOpen(v)
                    setDirty(true)
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Opens</Label>
                  <Select
                    value={opensAt}
                    onValueChange={(v) => {
                      setOpensAt(v)
                      setDirty(true)
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['10:00', '11:00', '12:00', '13:00'].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="mt-5 text-muted-foreground">–</span>
                <div className="space-y-1">
                  <Label className="text-xs">Closes</Label>
                  <Select
                    value={closesAt}
                    onValueChange={(v) => {
                      setClosesAt(v)
                      setDirty(true)
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['21:00', '22:00', '23:00', '23:30'].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>GST rate</Label>
                  <Select
                    value={profileGstRate}
                    onValueChange={(v) => {
                      setProfileGstRate(v)
                      setDirty(true)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESTAURANT_GST_RATES.map((r) => (
                        <SelectItem key={r.id} value={String(r.ratePct)}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-gstin">GSTIN</Label>
                  <Input
                    id="r-gstin"
                    value={profileGstin}
                    onChange={(e) => {
                      setProfileGstin(e.target.value)
                      setDirty(true)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={profileCurrency}
                    onValueChange={(v) => {
                      setProfileCurrency(v)
                      setDirty(true)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inr">INR ₹</SelectItem>
                      <SelectItem value="usd">USD $</SelectItem>
                      <SelectItem value="eur">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="space-y-4 p-8">
              <h3 className="text-base font-semibold">QR &amp; menu look</h3>
              <p className="text-xs text-muted-foreground">
                Guest-facing design lives on dedicated pages — not stubbed here.
              </p>
              <Link
                to="/qr"
                className="flex items-center justify-between gap-3 rounded-xl border border-line p-4 transition-colors hover:bg-surface-muted/50"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                    <QrCode className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">QR Designer</span>
                    <span className="text-xs text-muted-foreground">
                      Colors, corners, download counter &amp; table QR packs
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              <Link
                to="/menu/appearance"
                className="flex items-center justify-between gap-3 rounded-xl border border-line p-4 transition-colors hover:bg-surface-muted/50"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
                    <Palette className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Menu appearance</span>
                    <span className="text-xs text-muted-foreground">
                      Guest digital menu themes and layout
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              <p className="text-xs text-muted-foreground">
                Admin app theme is under the Appearance tab. Table print sheets stay on Tables.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="p-8">
              <h3 className="mb-2 text-base font-semibold">Notifications</h3>
              <ul className="divide-y divide-line">
                {notificationRows.map((row) => (
                  <li key={row.id} className="flex h-12 items-center justify-between">
                    <span className="text-sm">{row.label}</span>
                    <Switch
                      checked={Boolean(notifs[row.id])}
                      onCheckedChange={(on) => {
                        setNotifs((prev) => ({ ...prev, [row.id]: on }))
                        setDirty(true)
                      }}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="flex flex-col gap-5 p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold">Current plan</h3>
                <p className="mt-1 text-sm font-medium">{plan.name}</p>
                <p className="text-xs text-muted-foreground">
                  {plan.priceLabel}
                  {plan.priceMonthly !== null && '/mo'} · change plan, invoices, and usage on
                  Billing
                </p>
              </div>
              <Button asChild className="rounded-full shrink-0">
                <Link to="/billing">
                  Open billing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-content items-center justify-end gap-3 px-6 py-3">
            <p className="mr-auto text-sm text-muted-foreground">You have unsaved changes</p>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => {
                resetFields()
                setDirty(false)
              }}
            >
              Discard
            </Button>
            <Button className="rounded-full font-semibold" onClick={saveSettings}>
              Save changes
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
