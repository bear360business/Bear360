import { cn } from '@/lib/utils'

export interface TableChipProps {
  label: string
  /** brand = yellow pill (customer hero); muted = gray chip (order cards). */
  tone?: 'brand' | 'muted'
  className?: string
}

export function TableChip({ label, tone = 'brand', className }: TableChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        tone === 'brand' ? 'bg-brand text-brand-foreground' : 'bg-surface-muted text-muted-foreground',
        className,
      )}
    >
      {label}
    </span>
  )
}
