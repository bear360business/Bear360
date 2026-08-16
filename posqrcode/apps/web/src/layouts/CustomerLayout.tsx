import { Outlet, useLocation, useParams } from 'react-router-dom'
import { Loader2, QrCode, Store } from 'lucide-react'
import { BottomNav } from '@/components/app/BottomNav'
import { EmptyState } from '@/components/app/EmptyState'
import { CartProvider } from '@/hooks/use-cart'
import { GuestLocaleProvider, GuestLocaleSwitcher, useGuestLocale } from '@/hooks/use-guest-locale'
import { useGuestVenue } from '@/hooks/use-guest-venue'
import { useServiceConfig } from '@/hooks/use-service-config'
import { cn } from '@/lib/utils'

/**
 * 480px centered PWA column with cart context + bottom nav (doc §4.4).
 * Serves both entry points: a table QR and the table-free counter QR
 * (`tableId` is then absent).
 */
export function CustomerLayout() {
  const { restaurantId = '', tableId = '' } = useParams()
  const { pathname } = useLocation()
  const { restaurant, loading, error } = useGuestVenue(restaurantId, tableId)
  const { config: service } = useServiceConfig()
  // Landing has no bottom nav; menu/cart/success do (doc §6.15–6.18).
  const showNav = /\/(menu|cart|success)$/.test(pathname)
  const isLanding = !showNav
  // Counter QR can be switched off — block deep links to menu/cart too, not just landing.
  const counterBlocked = tableId === '' && !service.counterOrdering && showNav

  if (loading) {
    return (
      <div className="mx-auto flex h-[100svh] max-h-[100svh] w-full max-w-pwa flex-col items-center justify-center overflow-hidden bg-surface-page px-4 md:border-x md:border-line">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="mt-3 text-sm text-muted-foreground">Loading restaurant…</p>
      </div>
    )
  }

  if (!restaurant || error) {
    return (
      <div className="mx-auto flex h-[100svh] max-h-[100svh] w-full max-w-pwa flex-col items-center justify-center overflow-hidden bg-surface-page px-4 md:border-x md:border-line">
        <EmptyState
          icon={Store}
          title="Restaurant not found"
          description="This QR link is invalid or the store was removed."
        />
      </div>
    )
  }

  return (
    <GuestLocaleProvider restaurantId={restaurantId}>
      <CartProvider
        restaurantId={restaurantId}
        tableId={tableId}
        gstRatePct={restaurant.gstRatePct}
      >
        <div
          className={cn(
            // Lock to the viewport so the bottom nav stays pinned; only the main pane scrolls.
            'mx-auto flex h-[100svh] max-h-[100svh] w-full max-w-pwa flex-col overflow-hidden md:border-x md:border-line',
            isLanding ? 'bg-ink-900' : 'bg-surface-page',
          )}
        >
          <CustomerChrome
            isLanding={isLanding}
            counterBlocked={counterBlocked}
            showNav={showNav}
            restaurantName={restaurant.name}
          />
        </div>
      </CartProvider>
    </GuestLocaleProvider>
  )
}

function CustomerChrome({
  isLanding,
  counterBlocked,
  showNav,
  restaurantName,
}: {
  isLanding: boolean
  counterBlocked: boolean
  showNav: boolean
  restaurantName: string
}) {
  const { enabledLocales, t } = useGuestLocale()
  const showLangBar = !isLanding && !counterBlocked && enabledLocales.length > 1

  return (
    <>
      {showLangBar && (
        <div className="flex shrink-0 justify-end border-b border-line bg-surface px-3 py-1.5">
          <GuestLocaleSwitcher variant="light" />
        </div>
      )}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain',
          isLanding && '[&>*]:flex [&>*]:min-h-full [&>*]:flex-1 [&>*]:flex-col',
        )}
      >
        {counterBlocked ? (
          <div className="flex flex-1 items-center justify-center px-4">
            <EmptyState
              icon={QrCode}
              title={t('shell.scanTable')}
              description={t('shell.scanTableDesc', { name: restaurantName })}
            />
          </div>
        ) : (
          <Outlet />
        )}
      </div>
      {showNav && !counterBlocked && <BottomNav />}
    </>
  )
}
