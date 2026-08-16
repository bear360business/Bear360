import { PLAN_META, type PlanId } from '@/lib/tenant'
import { cn } from '@/lib/utils'

const toneByPlan: Record<PlanId, string> = {
  basic: 'bg-surface-muted text-muted-foreground',
  professional: 'bg-brand text-brand-foreground',
  enterprise: 'bg-ink-900 text-white',
}

export interface PlanBadgeProps {
  plan: PlanId
  size?: 'sm' | 'md'
  /** 3-letter form for tight spots — the rail footer next to a long name. */
  compact?: boolean
  className?: string
}

/** The plan chip — wherever a tenant appears, so does its plan (doc §11.3). */
export function PlanBadge({ plan, size = 'sm', compact = false, className }: PlanBadgeProps) {
  const meta = PLAN_META[plan]
  return (
    <span
      title={compact ? meta.name : undefined}
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        toneByPlan[plan],
        className,
      )}
    >
      {compact ? meta.short : meta.name}
    </span>
  )
}
