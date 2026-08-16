import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ChartCardProps {
  title: string
  /** Right header slot (Select / segmented control). */
  action?: ReactNode
  /** Fixed chart-region height — no layout shift across states (doc §7.4). */
  height?: number
  className?: string
  children: ReactNode
}

export function ChartCard({ title, action, height = 280, className, children }: ChartCardProps) {
  return (
    <div className={cn('rounded-card border border-line bg-surface p-6 shadow-card', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </div>
  )
}
