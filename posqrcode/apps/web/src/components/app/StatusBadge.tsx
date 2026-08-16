import { cn } from '@/lib/utils'
import { getStatusStyle, type AnyStatus } from '@/lib/status'

export interface StatusBadgeProps {
  status: AnyStatus
  /** Overrides the status's default word ("Paid" on an invoice, say). */
  label?: string
  className?: string
}

/**
 * The ONLY way status colors reach the UI (doc §7.11, §9).
 * ● 6px dot + Caption label · pill · tint bg + 600-weight colored text.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = getStatusStyle(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        style.bgClass,
        style.textClass,
        className,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', style.dotClass)} />
      {label ?? style.label}
    </span>
  )
}
