import { Flame, Pencil } from 'lucide-react'
import { QuantityStepper } from '@/components/app/QuantityStepper'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { inr } from '@/lib/currency'
import type { MenuItem } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Green/red dot for veg / non-veg. */
function VegDot({ veg }: { veg: boolean }) {
  return (
    <span
      title={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={cn(
        'inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border',
        veg ? 'border-success' : 'border-danger',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', veg ? 'bg-success' : 'bg-danger')} />
    </span>
  )
}

export interface AdminMenuItemCardProps {
  item: MenuItem
  available: boolean
  onToggleAvailable: (available: boolean) => void
  onEdit: () => void
}

/** Admin variant: vertical card with image, availability switch, edit (doc §7.6). */
export function AdminMenuItemCard({
  item,
  available,
  onToggleAvailable,
  onEdit,
}: AdminMenuItemCardProps) {
  return (
    <div
      className={cn(
        'group flex flex-col rounded-card border border-line bg-surface shadow-card transition-opacity',
        !available && 'opacity-60',
      )}
    >
      <div className="relative m-3 mb-0 overflow-hidden rounded-xl">
        <img src={item.image} alt={item.name} className="aspect-video w-full object-cover" />
        {!available && <StatusBadge status="sold-out" className="absolute left-2 top-2" />}
      </div>
      <div className="flex flex-1 flex-col p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
          <div className="flex items-center gap-1.5 pt-0.5">
            {item.spicy && <Flame className="h-3.5 w-3.5 text-warning" />}
            <VegDot veg={item.veg} />
          </div>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{inr(item.price)}</span>
          <div className="flex items-center gap-2">
            <Switch
              checked={available}
              onCheckedChange={onToggleAvailable}
              aria-label={`${item.name} availability`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit {item.name}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export interface CustomerMenuItemCardProps {
  item: MenuItem
  qty: number
  onAdd: () => void
  onQtyChange: (qty: number) => void
  /** Platform flags (super admin controls): photos, badges, ordering. */
  showImage?: boolean
  showBadges?: boolean
  canOrder?: boolean
  /** Ordering & checkout → catalogue mode. */
  hidePrice?: boolean
}

/** Customer variant: horizontal, Add pill overlapping the image (doc §6.16, §7.6). */
export function CustomerMenuItemCard({
  item,
  qty,
  onAdd,
  onQtyChange,
  showImage = true,
  showBadges = true,
  canOrder = true,
  hidePrice = false,
}: CustomerMenuItemCardProps) {
  const soldOut = !item.available
  const controls =
    qty > 0 ? (
      <QuantityStepper value={qty} onChange={onQtyChange} size="sm" />
    ) : (
      <button
        type="button"
        disabled={soldOut}
        onClick={onAdd}
        className="h-8 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-brand-foreground shadow-raised transition-colors hover:bg-brand hover:border-brand disabled:pointer-events-none"
      >
        + Add
      </button>
    )

  return (
    <div
      className={cn(
        'flex gap-4 rounded-card border border-line bg-surface p-4 shadow-card',
        soldOut && 'opacity-60',
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {item.description}
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          {!hidePrice && inr(item.price)}
          {showBadges && item.spicy && <Flame className="h-3.5 w-3.5 text-warning" />}
          {showBadges && <VegDot veg={item.veg} />}
          {soldOut && <StatusBadge status="sold-out" />}
        </div>
      </div>
      {showImage ? (
        <div className={cn('relative shrink-0 self-start', canOrder && 'pb-4')}>
          <img src={item.image} alt={item.name} className="h-24 w-24 rounded-xl object-cover" />
          {canOrder && (
            <div className="absolute inset-x-0 -bottom-0 flex justify-center">{controls}</div>
          )}
        </div>
      ) : (
        canOrder && <div className="flex shrink-0 items-center">{controls}</div>
      )}
    </div>
  )
}
