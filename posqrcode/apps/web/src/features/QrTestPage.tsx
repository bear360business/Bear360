import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, ArrowRight, ScanLine, Smartphone } from 'lucide-react'
import { BrandLogo, brandLogoUrl } from '@/components/app/BrandLogo'
import { StatusBadge } from '@/components/app/StatusBadge'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import { useServiceConfig } from '@/hooks/use-service-config'
import { useTables } from '@/hooks/use-tables'
import { getCounterQrUrl, getTableQrUrl } from '@/lib/mock'
import { ORDER_TYPE_META, tableFreeOrderTypes } from '@/lib/service-config'

/**
 * Customer QR test board — every table's QR in one place.
 * Tap a card to simulate a scan, or scan a code with a real phone.
 */
export function QrTestPage() {
  const restaurant = useCurrentVenue()
  const venueId = restaurant.slug || restaurant.id
  const { tables } = useTables()
  const { config: service, enabledOrderTypes } = useServiceConfig()
  const counterUrl = getCounterQrUrl(venueId)
  const counterTypes = tableFreeOrderTypes(enabledOrderTypes)

  return (
    <div className="force-light min-h-screen bg-surface-page px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All portals
        </Link>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <BrandLogo size={56} className="rounded-xl shadow-card" />
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Customer QR testing
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {restaurant.name || 'No venue selected'} · {tables.length} tables — each QR encodes
              that table's ordering URL, plus one counter QR that needs no table at all
            </p>
          </div>
        </div>

        {/* How to test */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint">
              <ScanLine className="h-5 w-5 text-ink-900" />
            </span>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Tap any card</span> to simulate a
              scan — it opens that table's landing → menu → cart → GST bill → live tracking.
            </p>
          </div>
          <div className="flex gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint">
              <Smartphone className="h-5 w-5 text-ink-900" />
            </span>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Scan with a real phone:</span> run{' '}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                npm run dev -- --host
              </code>{' '}
              and open this page via your computer's network IP — the QRs then point your phone at
              the same address.
            </p>
          </div>
        </div>

        {/* Table-free counter QR */}
        {service.counterOrdering && venueId && (
          <div className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              No table needed
            </h2>
            <Link
              to={`/r/${venueId}`}
              className="group mt-3 flex flex-col items-center gap-4 rounded-card border-2 border-brand bg-surface p-5 shadow-card transition-shadow hover:shadow-raised sm:flex-row"
            >
              <div className="shrink-0 rounded-xl border-2 border-brand bg-white p-2.5">
                <QRCodeSVG
                  value={counterUrl}
                  size={116}
                  level="M"
                  imageSettings={{ src: brandLogoUrl, height: 24, width: 24, excavate: true }}
                />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <span className="font-display text-lg font-bold text-foreground">Counter QR</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  For restaurants without tables — kiosks, takeaway counters, cloud kitchens. Opens
                  the same menu with{' '}
                  <span className="font-medium text-foreground">
                    {counterTypes.length > 0
                      ? counterTypes
                          .map((t) => ORDER_TYPE_META.find((m) => m.id === t)?.label ?? t)
                          .join(' · ')
                      : 'no order type enabled'}
                  </span>
                  {' '}— dine-in is never offered.
                </p>
                <code className="mt-2 inline-block truncate rounded bg-surface-muted px-2 py-1 text-xs text-muted-foreground">
                  {counterUrl}
                </code>
                <span className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-ink-900 sm:justify-start">
                  Open counter ordering
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* QR grid */}
        <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Table QRs
        </h2>
        {tables.length === 0 ? (
          <p className="mt-3 rounded-card border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
            No tables yet — add them in Admin → Tables, or log in so live floor data can load.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {tables.map((table) => {
              const url = getTableQrUrl(venueId, table.id)
              return (
                <Link
                  key={table.id}
                  to={`/r/${venueId}/table/${table.id}`}
                  className="group flex flex-col items-center rounded-card border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-raised"
                >
                  <div className="rounded-xl border-2 border-brand bg-white p-2.5">
                    <QRCodeSVG
                      value={url}
                      size={116}
                      level="M"
                      imageSettings={{ src: brandLogoUrl, height: 24, width: 24, excavate: true }}
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-display text-base font-bold text-foreground">
                      {table.name}
                    </span>
                    <StatusBadge status={table.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{table.seats} seats</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-900">
                    Open table
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          QRs resolve against this page's origin ({window.location.origin}) — carts are kept per
          table, and the counter QR has its own.
        </p>
      </div>
    </div>
  )
}
