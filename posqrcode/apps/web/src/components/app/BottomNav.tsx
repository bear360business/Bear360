import { NavLink } from 'react-router-dom'
import { ReceiptText, ShoppingCart, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useGuestLocale } from '@/hooks/use-guest-locale'
import { cn } from '@/lib/utils'

/** Customer bottom nav: Menu · Cart (badge) · Status — pinned in the PWA shell (doc §4.4). */
export function BottomNav() {
  const { count, base } = useCart()
  const { t } = useGuestLocale()

  const items: { to: string; label: string; icon: LucideIcon; badge?: number }[] = [
    { to: `${base}/menu`, label: t('nav.menu'), icon: UtensilsCrossed },
    { to: `${base}/cart`, label: t('nav.cart'), icon: ShoppingCart, badge: count },
    { to: `${base}/success`, label: t('nav.status'), icon: ReceiptText },
  ]

  return (
    <nav
      aria-label={t('nav.aria')}
      className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid h-14 grid-cols-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'relative flex h-7 items-center justify-center rounded-full px-3.5 transition-colors',
                    isActive && 'bg-brand text-brand-foreground',
                  )}
                >
                  <item.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.75} />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className={cn('leading-none', isActive && 'font-semibold')}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
