import { CheckCircle2, MoreVertical, Phone, Trash2, UserX } from 'lucide-react'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getRole, initials } from '@/lib/mock'
import type { Employee } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface EmployeeCardProps {
  employee: Employee
  readOnly?: boolean
  onEdit?: (employee: Employee) => void
  onActivate?: (employee: Employee) => void
  onDeactivate?: (employee: Employee) => void
  onDelete?: (employee: Employee) => void
  className?: string
}

/** Avatar · name · role chip · status · phone · shift today (doc §8.5 A13, §11.3). */
export function EmployeeCard({
  employee,
  readOnly,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  className,
}: EmployeeCardProps) {
  const role = getRole(employee.roleId)
  const isInactive = employee.status === 'inactive'

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11">
          <AvatarFallback className="bg-brand/20 text-sm font-semibold text-foreground">
            {initials(employee.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-bold text-foreground">
                {employee.name}
              </h3>
              <span
                className={cn(
                  'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  role.bgClass,
                  role.colorClass,
                )}
              >
                {role.name}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions for {employee.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={readOnly} onSelect={() => onEdit?.(employee)}>
                  Edit employee
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isInactive ? (
                  <DropdownMenuItem
                    disabled={readOnly}
                    className="text-emerald-500 focus:text-emerald-500 font-medium"
                    onSelect={() => onActivate?.(employee)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                    Activate again
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    disabled={readOnly}
                    className="text-muted-foreground focus:text-foreground"
                    onSelect={() => onDeactivate?.(employee)}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={readOnly}
                  className="text-danger focus:text-danger font-medium"
                  onSelect={() => onDelete?.(employee)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete employee
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <StatusBadge status={employee.status} />

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{employee.phone}</span>
        </p>
        <p>
          Shift today:{' '}
          <span className="font-medium text-foreground">
            {employee.shiftToday ?? 'Off'}
          </span>
        </p>
      </div>
    </div>
  )
}
