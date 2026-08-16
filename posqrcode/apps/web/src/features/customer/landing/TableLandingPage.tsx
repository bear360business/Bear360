import { Link, useParams } from 'react-router-dom'
import { Loader2, MapPin, QrCode, Star } from 'lucide-react'
import { BrandLogo } from '@/components/app/BrandLogo'
import { EmptyState } from '@/components/app/EmptyState'
import { useCart } from '@/hooks/use-cart'
import { GuestLocaleSwitcher, useGuestLocale } from '@/hooks/use-guest-locale'
import { useGuestVenue } from '@/hooks/use-guest-venue'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { useServiceConfig } from '@/hooks/use-service-config'
import { orderTypeCaption, orderTypeLabel } from '@/lib/i18n'
import { ORDER_TYPE_META } from '@/lib/service-config'
import { cn } from '@/lib/utils'
import { customerBase } from '../routes'

/**
 * Full-bleed QR landing: cover image fills the phone, brand leads,
 * one CTA docks at the bottom — no empty mid-screen void (doc §6.15).
 */
export function TableLandingPage() {
  const { restaurantId = '', tableId = '' } = useParams()
  const { restaurant, table, loading } = useGuestVenue(restaurantId, tableId)
  const { config } = usePlatformConfig()
  const { config: service } = useServiceConfig()
  const { availableOrderTypes, orderType, setOrderType } = useCart()
  const { locale, t } = useGuestLocale()
  const tableFree = tableId === ''

  if (loading) {
    return (
      <div className="flex min-h-[100svh] flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/80" />
      </div>
    )
  }

  if (!restaurant || (tableId !== '' && !table)) {
    return (
      <div className="flex min-h-[100svh] flex-1 items-center justify-center px-4">
        <EmptyState
          icon={QrCode}
          title={t('landing.qrInactive')}
          description={t('landing.qrInactiveDesc')}
        />
      </div>
    )
  }

  if (tableFree && !service.counterOrdering) {
    return (
      <div className="flex min-h-[100svh] flex-1 items-center justify-center px-4">
        <EmptyState
          icon={QrCode}
          title={t('shell.scanTable')}
          description={t('landing.scanTableDesc', { name: restaurant.name })}
        />
      </div>
    )
  }

  const base = customerBase(restaurantId, tableId)
  const canOrder =
    restaurant.isOpen && config.service.onlineOrdering && availableOrderTypes.length > 0
  const typeLabel = orderTypeLabel(orderType, locale)
  const counterTypes = ORDER_TYPE_META.filter((entry) => availableOrderTypes.includes(entry.id))

  return (
    <div
      className="relative flex min-h-[100svh] flex-1 flex-col overflow-hidden text-white"
      style={{
        backgroundColor: '#0f172a',
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(255,255,255,0.07) 1px, transparent 1px),
          radial-gradient(circle at 80% 60%, rgba(255,255,255,0.07) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(15,23,42,0.75), rgba(15,23,42,0.45) 45%, rgba(15,23,42,0.96)),
          url(${restaurant.coverImage})
        `,
        backgroundSize: '28px 28px, 28px 28px, cover, cover',
        backgroundPosition: '0 0, 0 0, center, center',
      }}
    >
      <div className="relative z-10 flex flex-1 flex-col px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] animate-in fade-in duration-500">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 text-2xl shadow-raised ring-1 ring-white/40">
            {restaurant.emoji}
          </span>
          <div className="flex flex-col items-end gap-2">
            <GuestLocaleSwitcher variant="dark" />
            {restaurant.isOpen ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-success/40 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                {t('landing.openNow')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70 ring-1 ring-white/15 backdrop-blur-sm">
                {t('landing.closed')}
                {restaurant.opensAt ? ` · ${restaurant.opensAt}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            {tableFree
              ? t('landing.counterOrder')
              : t('landing.table', { n: table?.number ?? '' })}
          </p>
          <h1 className="mt-2 font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight drop-shadow-sm">
            {restaurant.name}
          </h1>
          <p className="mt-3 max-w-[20rem] text-base leading-relaxed text-white/80">
            {tableFree ? t('landing.taglineCounter') : t('landing.taglineTable')}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/70">
            {config.customerUi.showRatings && (
              <span className="inline-flex items-center gap-1 font-medium text-white">
                <Star className="h-3.5 w-3.5 fill-brand text-brand" />
                {restaurant.rating}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {restaurant.city}
            </span>
            <span className="text-white/50">·</span>
            <span>{restaurant.cuisine}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-3 bg-gradient-to-t from-ink-900 via-ink-900/95 to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
        {counterTypes.length > 1 && (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.min(counterTypes.length, 3)}, 1fr)`,
            }}
          >
            {counterTypes.map((entry) => {
              const on = orderType === entry.id
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setOrderType(entry.id)}
                  className={cn(
                    'rounded-2xl px-3 py-3 text-left transition-all duration-200',
                    on
                      ? 'bg-brand text-brand-foreground shadow-md scale-[1.01]'
                      : 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15',
                  )}
                >
                  <span className="block text-sm font-semibold">
                    {orderTypeLabel(entry.id, locale)}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block text-xs',
                      on ? 'text-brand-foreground/80' : 'text-white/60',
                    )}
                  >
                    {tableFree
                      ? orderTypeCaption(entry.id, locale)
                      : entry.id === 'dine-in'
                        ? t('landing.table', { n: table?.number ?? '' })
                        : entry.id === 'takeaway'
                          ? t('landing.pickupAtCounter')
                          : orderTypeCaption(entry.id, locale)}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <Link
          to={`${base}/menu`}
          className={cn(
            'flex h-14 items-center justify-center rounded-full text-base font-semibold transition-all duration-200 active:scale-[0.98]',
            canOrder
              ? 'bg-brand text-brand-foreground shadow-lg shadow-brand/30 hover:bg-brand-hover'
              : 'bg-white/15 text-white ring-1 ring-white/20',
          )}
        >
          {canOrder
            ? t('landing.viewMenu', {
                type: typeLabel || (tableFree ? t('landing.takeaway') : t('landing.dineIn')),
              })
            : t('landing.viewMenuPaused')}
        </Link>

        {config.customerUi.showPoweredBy && (
          <p className="flex items-center justify-center gap-1.5 pb-1 text-[11px] text-white/45">
            {t('landing.poweredBy')} <BrandLogo size={14} className="rounded opacity-80" /> Bear 360
          </p>
        )}
      </div>
    </div>
  )
}
