import { cn } from '@/lib/utils'

export interface CategoryChipProps {
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
}

/** 36h pill; active = yellow bg + black medium text (doc §7.9). */
export function CategoryChip({ label, count, active = false, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm transition-colors',
        active
          ? 'bg-brand font-semibold text-brand-foreground'
          : 'border border-line bg-surface font-medium text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      {count != null && (
        <span className={cn('text-xs', active ? 'text-ink-900/70' : 'text-muted-foreground')}>
          {count}
        </span>
      )}
    </button>
  )
}
