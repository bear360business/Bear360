import { useNavigate, useParams } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useGuestLocale } from '@/hooks/use-guest-locale'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { getVenueOps } from '@/hooks/use-venue-ops'
import { inr } from '@/lib/currency'
import { getRestaurantById } from '@/lib/mock'

/**
 * Dark pill above the pinned bottom nav; appears once cart > 0 (doc §7.10).
 * Bottom offset = nav (3.5rem) + safe area + gap.
 */
export function FloatingCartButton() {
  const { count, total, base } = useCart()
  const { config } = usePlatformConfig()
  const { t } = useGuestLocale()
  const { restaurantId = '' } = useParams()
  const navigate = useNavigate()
  const ops = getVenueOps()
  const currency = getRestaurantById(restaurantId)?.currency ?? 'INR'

  if (count === 0 || !config.service.onlineOrdering || ops.catalogueMode) return null

  return (
    <div
      className="pointer-events-none fixed z-40 flex justify-center px-4"
      style={{
        left: 'max(0px, calc(50% - 240px))',
        right: 'max(0px, calc(50% - 240px))',
        bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >
      <button
        type="button"
        onClick={() => navigate(`${base}/cart`)}
        className="pointer-events-auto flex h-[52px] w-full max-w-[calc(480px-2rem)] items-center justify-between rounded-full bg-ink-900 px-5 text-white shadow-float transition-transform animate-in slide-in-from-bottom-4 hover:scale-[1.01]"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
              {count}
            </span>
          </span>
          <span className="pl-1">{t('menu.viewCart')}</span>
        </span>
        <span className="font-display text-base font-bold">{inr(total, currency)}</span>
      </button>
    </div>
  )
}
