import type { ReactNode } from 'react'
import { LIMIT_META, type LimitKey, type LimitState } from '@/lib/tenant'
import { cn } from '@/lib/utils'

const barByState: Record<LimitState['state'], string> = {
  ok: 'bg-brand',
  warn: 'bg-warning',
  full: 'bg-warning',
  over: 'bg-danger',
}

const labelByState: Record<LimitState['state'], string | null> = {
  ok: null,
  warn: 'nearly full',
  full: 'at limit',
  over: 'over limit',
}

export interface UsageMeterProps {
  limitKey: LimitKey
  state: LimitState
  /** Right-aligned CTA, usually an upgrade button. */
  action?: ReactNode
  className?: string
}

/**
 * One component for every "12 of 50 used" surface — billing, tenant detail and
 * the blocking dialog all render identically (doc §4.3, §11.3).
 */
export function UsageMeter({ limitKey, state, action, className }: UsageMeterProps) {
  const meta = LIMIT_META[limitKey]
  const unlimited = state.max === null
  const note = labelByState[state.state]

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{meta.label}</span>
        <span className="flex items-center gap-2">
          <span className="tabular-nums text-muted-foreground">
            {state.used.toLocaleString('en-IN')} / {unlimited ? '∞' : state.max?.toLocaleString('en-IN')}
          </span>
          {note && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                state.state === 'over' ? 'bg-danger-tint text-danger' : 'bg-warning-tint text-warning',
              )}
            >
              {note}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={state.used}
          aria-valuemax={state.max ?? undefined}
          aria-label={`${meta.label} usage`}
        >
          <div
            className={cn('h-full rounded-full transition-[width]', barByState[state.state])}
            style={{ width: unlimited ? '12%' : `${Math.max(state.ratio * 100, 2)}%` }}
          />
        </div>
        {action}
      </div>
    </div>
  )
}
