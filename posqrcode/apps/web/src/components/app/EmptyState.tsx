import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /** Lucide icon rendered inside the illustration circle. */
  icon?: LucideIcon
  /** Or a fully custom illustration node (e.g. an emoji block). */
  illustration?: ReactNode
  title: string
  description?: string
  /** Primary pill Button (caller supplies the <Button>). */
  action?: ReactNode
  /** KDS / dark-surface variant: white/60 text (doc §7.12). */
  dark?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  dark = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      {illustration ?? (
        Icon && (
          <div
            className={cn(
              'mb-6 flex h-20 w-20 items-center justify-center rounded-full',
              dark ? 'bg-white/10' : 'bg-brand-tint',
            )}
          >
            <Icon
              className={cn('h-9 w-9', dark ? 'text-white/60' : 'text-ink-900')}
              strokeWidth={1.5}
            />
          </div>
        )
      )}
      <h3
        className={cn(
          'text-xl font-semibold',
          dark ? 'text-white' : 'text-foreground',
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'mt-2 max-w-[360px] text-sm',
            dark ? 'text-white/60' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
