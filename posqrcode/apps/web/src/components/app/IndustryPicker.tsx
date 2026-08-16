import { Check } from 'lucide-react'
import { getIndustriesWithIcons } from '@/lib/industries-catalog'
import type { IndustryId } from '@/lib/industries'
import { cn } from '@/lib/utils'

export interface IndustryPickerProps {
  value: IndustryId
  onChange: (id: IndustryId) => void
  /** Compact grid for forms; default matches the marketing two-column list. */
  className?: string
}

/** Two-column industry master picker (Restaurants, Cafes, Hotels, …). */
export function IndustryPicker({ value, onChange, className }: IndustryPickerProps) {
  const industries = getIndustriesWithIcons()
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {industries.map((industry) => {
        const active = value === industry.id
        const Icon = industry.icon
        return (
          <button
            key={industry.id}
            type="button"
            onClick={() => onChange(industry.id)}
            className={cn(
              'relative flex items-start gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-colors',
              active
                ? 'border-brand bg-brand-tint'
                : 'border-line bg-surface hover:border-ink-900/20 hover:bg-surface-muted/40',
            )}
          >
            {active && (
              <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                <Check className="h-3 w-3 text-brand-foreground" />
              </span>
            )}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-tint text-info">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 pr-6">
              <span className="block text-sm font-semibold text-foreground">{industry.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{industry.caption}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
