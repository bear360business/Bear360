import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  /** sm = 32h (admin/cart rows) · md = 36h (customer menu). */
  size?: 'sm' | 'md'
  className?: string
}

/** Yellow pill `[− n +]` stepper (doc §7.14). onChange(0) means remove. */
export function QuantityStepper({ value, onChange, size = 'md', className }: QuantityStepperProps) {
  const btn =
    'flex items-center justify-center rounded-full text-ink-900 transition-colors hover:bg-ink-900/10 disabled:opacity-40'
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full bg-brand font-semibold text-brand-foreground shadow-card',
        size === 'sm' ? 'h-8 px-1' : 'h-9 px-1.5',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        className={cn(btn, size === 'sm' ? 'h-6 w-6' : 'h-7 w-7')}
        onClick={() => onChange(value - 1)}
      >
        <Minus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
      <span className={cn('text-center tabular-nums', size === 'sm' ? 'w-6 text-sm' : 'w-7')}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        className={cn(btn, size === 'sm' ? 'h-6 w-6' : 'h-7 w-7')}
        onClick={() => onChange(value + 1)}
      >
        <Plus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  )
}
