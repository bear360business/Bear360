import { getRole, shiftHours } from '@/lib/mock'
import type { Shift } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface ShiftCardProps {
  shift: Shift
  className?: string
  onClick?: () => void
}

/** Role-coloured chip: time range + hours (doc §8.5 A15, §11.3). */
export function ShiftCard({ shift, className, onClick }: ShiftCardProps) {
  const role = getRole(shift.roleId)
  const hours = shiftHours(shift.start, shift.end)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg px-2 py-1.5 text-left transition-opacity hover:opacity-90',
        role.bgClass,
        className,
      )}
    >
      <p className={cn('text-[11px] font-semibold tabular-nums leading-tight', role.colorClass)}>
        {shift.start}–{shift.end}
      </p>
      <p className={cn('text-[10px] tabular-nums opacity-80', role.colorClass)}>
        {hours}h · {role.name}
      </p>
    </button>
  )
}
