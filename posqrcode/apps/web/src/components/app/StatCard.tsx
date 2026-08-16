import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { StatRecord, StatTone } from '@/lib/types'
import { cn } from '@/lib/utils'

const toneTile: Record<StatTone, string> = {
  default: 'bg-bluesoft/40 text-ink-900',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  info: 'bg-info-tint text-info',
  danger: 'bg-danger-tint text-danger',
}

export interface StatCardProps {
  stat: StatRecord
  icon: LucideIcon
  /** Whole card becomes a link (e.g. Pending → /orders?status=pending). */
  href?: string
}

/** Icon tile + Caption label + Space Grotesk value + delta row (doc §7.3). */
export function StatCard({ stat, icon: Icon, href }: StatCardProps) {
  const body = (
    <>
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          toneTile[stat.tone ?? 'default'],
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{stat.label}</p>
      <p className="mt-1 font-display text-[28px] font-bold leading-9 text-foreground">
        {stat.value}
      </p>
      {stat.delta != null && (
        <p
          className={cn(
            'mt-1 inline-flex items-center gap-1 text-xs font-semibold',
            stat.delta >= 0 ? 'text-success' : 'text-danger',
          )}
        >
          {stat.delta >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {Math.abs(stat.delta)}%
          {stat.deltaLabel && (
            <span className="font-normal text-muted-foreground">{stat.deltaLabel}</span>
          )}
        </p>
      )}
    </>
  )

  const className =
    'block rounded-card border border-line bg-surface p-6 shadow-card transition-shadow'

  if (href) {
    return (
      <Link to={href} className={cn(className, 'hover:shadow-raised')}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
}
