import { useMemo, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useShop } from '@/hooks/use-shop'
import { shopCategoryLabel, type ShopCategory } from '@/lib/shop-catalog'
import { cn } from '@/lib/utils'

/** Hardware marketplace — catalog managed by Super Admin → QR stands & shop. */
export function ShopPage() {
  const { activeProducts } = useShop()
  const [tab, setTab] = useState<'browse' | 'orders'>('browse')
  const [filter, setFilter] = useState<'all' | ShopCategory>('all')
  const [orders, setOrders] = useState(0)

  const visible = useMemo(() => {
    if (filter === 'all') return activeProducts
    return activeProducts.filter((p) => p.category === filter)
  }, [activeProducts, filter])

  return (
    <>
      <PageHeader
        title="Shop"
        caption="Purchase premium items and QR stands for your restaurant."
      />

      <div className="mb-4 flex w-fit gap-1 rounded-full bg-surface-muted p-1">
        {(
          [
            ['browse', 'Browse Shop'],
            ['orders', `My Orders (${orders})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              tab === id ? 'bg-surface text-foreground shadow-card' : 'text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <div className="mb-6 flex flex-wrap gap-1 rounded-full bg-surface-muted/70 p-1 w-fit">
          {(
            [
              ['all', 'All'],
              ['qr-stand', 'QR stands'],
              ['printer', 'Printers'],
              ['accessory', 'Accessories'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === id
                  ? 'bg-surface text-foreground shadow-card'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'orders' ? (
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {orders === 0
              ? 'No hardware orders yet. Browse the shop to request a quote.'
              : `${orders} demo order(s) queued — sales will contact you.`}
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="p-6">
            <EmptyState
              icon={ShoppingCart}
              title="No products available"
              description="Super Admin has not published items in this category yet."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <Card
              key={p.id}
              className="flex flex-col overflow-hidden rounded-card border-line shadow-card"
            >
              <div className="relative aspect-[4/3] shrink-0 bg-surface-muted">
                <img
                  src={p.image}
                  alt={p.alt || p.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute right-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-white">
                  ₹{p.price.toFixed(2)}
                </span>
                {p.category === 'qr-stand' && (
                  <span className="absolute left-3 top-3 rounded-full bg-ink-900/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {shopCategoryLabel(p.category)}
                  </span>
                )}
              </div>
              <CardContent className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground">
                  {p.name}
                </h3>
                {p.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-auto w-full rounded-xl"
                  onClick={() => {
                    setOrders((n) => n + 1)
                    toast.success('Quote requested', {
                      description: `${p.name} — demo order logged.`,
                    })
                    setTab('orders')
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  View details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
