import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type SkeletonVariant =
  | 'stat'
  | 'card'
  | 'table-row'
  | 'chart'
  | 'menu-item'
  | 'kitchen'

export interface LoadingSkeletonProps {
  variant: SkeletonVariant
  /** How many copies to render (default 1). Parent controls the grid/stack. */
  count?: number
  className?: string
}

function StatSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-4 h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-20" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="mt-3 h-3 w-3/5" />
      <Skeleton className="mt-4 h-9 w-full rounded-lg" />
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <div className="flex h-12 items-center gap-4 border-b border-line px-4">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/5" />
      <Skeleton className="ml-auto h-5 w-20 rounded-full" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <Skeleton className="mt-6 h-[280px] w-full rounded-xl" />
    </div>
  )
}

function MenuItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="mt-2 h-3 w-4/5" />
        <Skeleton className="mt-3 h-4 w-14" />
      </div>
      <Skeleton className="h-24 w-24 shrink-0 rounded-xl" />
    </div>
  )
}

/** Dark variant for the KDS (white/8 shimmer on ink-800). */
function KitchenSkeleton() {
  return (
    <div className="rounded-card border border-white/10 bg-ink-800 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 bg-white/10" />
        <Skeleton className="h-4 w-20 bg-white/10" />
      </div>
      <Skeleton className="mt-4 h-8 w-24 bg-white/10" />
      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <Skeleton className="h-4 w-4/5 bg-white/10" />
        <Skeleton className="h-4 w-3/5 bg-white/10" />
      </div>
      <Skeleton className="mt-6 h-14 w-full rounded-full bg-white/10" />
    </div>
  )
}

const variants: Record<SkeletonVariant, () => JSX.Element> = {
  stat: StatSkeleton,
  card: CardSkeleton,
  'table-row': TableRowSkeleton,
  chart: ChartSkeleton,
  'menu-item': MenuItemSkeleton,
  kitchen: KitchenSkeleton,
}

/**
 * Skeletons matching each real component's geometry (doc §7.13, §8.2).
 * Renders `count` siblings — wrap in your own grid/stack container.
 */
export function LoadingSkeleton({ variant, count = 1, className }: LoadingSkeletonProps) {
  const Variant = variants[variant]
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(className)}>
          <Variant />
        </div>
      ))}
    </>
  )
}
