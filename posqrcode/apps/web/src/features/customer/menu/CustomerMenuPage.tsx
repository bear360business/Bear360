import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, UtensilsCrossed } from 'lucide-react'
import { CategoryChip } from '@/components/app/CategoryChip'
import { FloatingCartButton } from '@/components/app/FloatingCartButton'
import { CustomerMenuItemCard } from '@/components/app/MenuItemCard'
import { EmptyState } from '@/components/app/EmptyState'
import { TableChip } from '@/components/app/TableChip'
import { Input } from '@/components/ui/input'
import { useCart } from '@/hooks/use-cart'
import { useGuestLocale } from '@/hooks/use-guest-locale'
import { useGuestVenue } from '@/hooks/use-guest-venue'
import { useMenuAppearance } from '@/hooks/use-menu-appearance'
import { useMenu } from '@/hooks/use-menu'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { getVenueOps, VENUE_OPS_EVENT, VENUE_OPS_KEY } from '@/hooks/use-venue-ops'
import { orderTypeLabel } from '@/lib/i18n'
import type { MenuItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Customer menu: sticky chips w/ scroll-spy, search, add-to-cart (doc §6.16). */
export function CustomerMenuPage() {
  const { restaurantId = '', tableId = '' } = useParams()
  const { restaurant, table } = useGuestVenue(restaurantId, tableId)
  const cart = useCart()
  const { locale, t } = useGuestLocale()
  const { categories: menuCategories, items: menuItems } = useMenu()
  // No table: show what the order will be instead of a table number.
  const sessionLabel = table
    ? t('landing.table', { n: table.number })
    : orderTypeLabel(cart.orderType, locale)
  const { config } = usePlatformConfig()
  const ordering = config.service.onlineOrdering

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [opsEpoch, setOpsEpoch] = useState(0)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    if (!activeCategory && menuCategories[0]) setActiveCategory(menuCategories[0].id)
  }, [menuCategories, activeCategory])

  useEffect(() => {
    const bump = () => setOpsEpoch((n) => n + 1)
    const onStorage = (e: StorageEvent) => {
      if (e.key === VENUE_OPS_KEY || e.key === null) bump()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(VENUE_OPS_EVENT, bump)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(VENUE_OPS_EVENT, bump)
    }
  }, [])

  const sections = useMemo(
    () =>
      [...menuCategories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => ({
          category,
          items: menuItems.filter(
            (item) =>
              item.categoryId === category.id &&
              item.available &&
              (query === '' || item.name.toLowerCase().includes(query.toLowerCase())),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [menuCategories, menuItems, query],
  )

  // Scroll-spy: highlight the chip of the section crossing the header line.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const id = visible[0]?.target.getAttribute('data-category')
        if (id) setActiveCategory(id)
      },
      { rootMargin: '-120px 0px -60% 0px' },
    )
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  const scrollTo = (categoryId: string) => {
    setActiveCategory(categoryId)
    sectionRefs.current[categoryId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cartHandlers = (item: MenuItem) => ({
    qty: cart.getQty(item.id),
    onAdd: () => cart.addItem(item),
    onQtyChange: (qty: number) => cart.setQty(item.id, qty),
  })

  const { appearance } = useMenuAppearance()
  const menuTheme = appearance.themeId
  // opsEpoch forces re-read after Ordering & checkout changes.
  const ops = useMemo(() => getVenueOps(), [opsEpoch])
  const darkLuxury = menuTheme === 'dark-luxury'
  const smartOrder = menuTheme === 'smart-order'
  const urban = menuTheme === 'urban-feast'
  const quick = menuTheme === 'quick-bite'
  const hero = menuTheme === 'pizza-style'

  return (
    <div
      data-menu-theme={menuTheme}
      className={cn(
        'pb-[7.5rem]',
        darkLuxury && 'bg-[#0B0B0F] text-white',
        smartOrder && 'bg-[#F3FBF5]',
        urban && 'bg-[#F7F4EF]',
        quick && 'bg-white',
        hero && 'bg-[#FFF8F0]',
      )}
    >
      {/* Compact sticky header */}
      <header
        className={cn(
          'sticky top-0 z-30 flex h-14 items-center justify-between px-4 text-white',
          smartOrder ? 'bg-success' : 'bg-ink-800',
        )}
      >
        <span className="flex min-w-0 items-center gap-2 font-display text-base font-bold">
          <span aria-hidden>{restaurant?.emoji ?? '🍽'}</span>
          <span className="truncate">{restaurant?.name ?? t('menu.fallbackTitle')}</span>
        </span>
        <TableChip label={sessionLabel} />
      </header>

      {/* Sticky category chips */}
      <div
        className={cn(
          'sticky top-14 z-30 flex gap-2 overflow-x-auto border-b px-4 py-2 [scrollbar-width:none]',
          darkLuxury ? 'border-white/10 bg-[#12121A]' : 'border-line bg-surface',
        )}
      >
        {menuCategories.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.name}
            active={activeCategory === category.id}
            onClick={() => scrollTo(category.id)}
          />
        ))}
      </div>

      {restaurant?.isOpen === false && (
        <p className="border-b border-destructive/30 bg-destructive-tint px-4 py-2.5 text-center text-xs font-semibold text-destructive">
          Store is currently closed for orders
        </p>
      )}
      {!ordering && restaurant?.isOpen !== false && (
        <p className="border-b border-warning/30 bg-warning-tint px-4 py-2.5 text-center text-xs font-medium text-warning">
          {t('menu.orderingPaused')}
        </p>
      )}
      {ops.catalogueMode && (
        <p className="border-b border-info/30 bg-info-tint px-4 py-2.5 text-center text-xs font-medium text-info">
          {t('menu.catalogueMode')}
        </p>
      )}

      <div className="space-y-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('menu.searchPlaceholder')}
            className="rounded-[10px] pl-9"
          />
        </div>

        {sections.length === 0 && (
          <EmptyState
            icon={query ? Search : UtensilsCrossed}
            title={query ? t('menu.noMatch', { query }) : t('menu.comingSoon')}
            description={query ? t('menu.noMatchDesc') : t('menu.comingSoonDesc')}
            action={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full border border-line px-5 py-2 text-sm font-semibold hover:bg-surface-muted"
                >
                  {t('menu.clearSearch')}
                </button>
              ) : undefined
            }
          />
        )}

        {sections.map(({ category, items }) => (
          <section
            key={category.id}
            data-category={category.id}
            ref={(el) => {
              sectionRefs.current[category.id] = el
            }}
            className="scroll-mt-32"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {category.emoji} {category.name}
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <CustomerMenuItemCard
                  key={item.id}
                  item={item}
                  {...cartHandlers(item)}
                  showImage={config.customerUi.showItemImages}
                  showBadges={config.customerUi.showVegSpiceBadges}
                  canOrder={ordering && !ops.catalogueMode && restaurant?.isOpen !== false}
                  hidePrice={ops.catalogueMode}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <FloatingCartButton />
    </div>
  )
}
