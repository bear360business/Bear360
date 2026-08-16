import type { StockLevel } from '@/lib/mock'
import { cn } from '@/lib/utils'

const meta: Record<StockLevel, { bar: string; dot: string; label: string; text: string }> = {
  out: { bar: 'bg-danger', dot: 'bg-danger', label: 'Out', text: 'text-danger' },
  low: { bar: 'bg-warning', dot: 'bg-warning', label: 'Low', text: 'text-warning' },
  watch: { bar: 'bg-info', dot: 'bg-info', label: 'Watch', text: 'text-info' },
  ok: { bar: 'bg-brand', dot: 'bg-success', label: 'In stock', text: 'text-muted-foreground' },
}

export interface StockLevelBarProps {
  level: StockLevel
  /** Fill fraction 0–1 (stock ÷ a comfortable target). */
  ratio: number
  /** Show the word next to the bar — colour is never the only signal. */
  showLabel?: boolean
  className?: string
}

/** 10-segment stock indicator — the one place stock colour is decided (doc §8.4). */
export function StockLevelBar({ level, ratio, showLabel = true, className }: StockLevelBarProps) {
  const filled = Math.max(level === 'out' ? 0 : 1, Math.round(Math.min(ratio, 1) * 10))
  const style = meta[level]

  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex gap-0.5" role="img" aria-label={`${style.label} — ${Math.round(ratio * 100)}%`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-3 w-1.5 rounded-[2px]',
              i < filled ? style.bar : 'bg-surface-muted',
            )}
          />
        ))}
      </span>
      {showLabel && (
        <span className={cn('text-xs font-medium', style.text)}>{style.label}</span>
      )}
    </span>
  )
}

export function StockDot({ level, className }: { level: StockLevel; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', meta[level].dot, className)}
    />
  )
}
