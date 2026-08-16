import { cn } from '@/lib/utils'

export interface VegMarkProps {
  veg: boolean
  size?: number
  className?: string
}

/**
 * The Indian FSSAI veg/non-veg mark: a square outline with a filled dot.
 * Green = vegetarian, brown-red = non-vegetarian. Shape carries the meaning
 * as well as the colour, so it survives colour-blindness and mono printing.
 */
export function VegMark({ veg, size = 14, className }: VegMarkProps) {
  return (
    <span
      role="img"
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      title={veg ? 'Vegetarian' : 'Non-vegetarian'}
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[3px] border-[1.5px]',
        veg ? 'border-success' : 'border-danger',
        className,
      )}
    >
      <span
        style={{ width: size * 0.42, height: size * 0.42 }}
        className={cn('rounded-full', veg ? 'bg-success' : 'bg-danger')}
      />
    </span>
  )
}
