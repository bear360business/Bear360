import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { PageHeader } from '@/components/app/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useStaff } from '@/hooks/use-staff'
import { useAttendance } from '@/hooks/use-staff-ops'
import { useTenant } from '@/hooks/use-tenant'
import { formatVariance, initials, shiftHours } from '@/lib/mock'
import type { AttendanceRow, AttendanceStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const statusLabel: Record<AttendanceStatus, string> = {
  ok: 'On time',
  late: 'Late',
  early: 'Left early',
  absent: 'Absent',
  pending: 'Not in yet',
}

const statusClass: Record<AttendanceStatus, string> = {
  ok: 'bg-success-tint text-success',
  late: 'bg-warning-tint text-warning',
  early: 'bg-info-tint text-info',
  absent: 'bg-danger-tint text-danger',
  pending: 'bg-surface-muted text-muted-foreground',
}

/** A16 Attendance — day view with inline anomaly approval (doc §8.5). */
export function AttendancePage() {
  const { readOnly } = useTenant()
  const { employees } = useStaff()
  const { rows, approve } = useAttendance()

  const empOf = (id: string) => employees.find((e) => e.id === id)

  const onApprove = (row: AttendanceRow) => {
    approve(row.id)
    const emp = empOf(row.employeeId)
    toast.success(`Approved ${emp?.name ?? 'attendance'}`, {
      description: 'Variance noted for payroll.',
    })
  }

  const pendingCount = rows.filter((r) => r.needsApproval).length
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <>
      <PageHeader
        title="Attendance"
        caption={
          pendingCount > 0
            ? `${todayLabel} · ${pendingCount} need${pendingCount === 1 ? 's' : ''} approval`
            : todayLabel
        }
      />

      <Card className="rounded-card border-line shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted/50 text-left">
                  <Th className="pl-4">Employee</Th>
                  <Th>Scheduled</Th>
                  <Th>Clock in</Th>
                  <Th>Clock out</Th>
                  <Th className="text-right">Hours</Th>
                  <Th>Variance</Th>
                  <Th>Status</Th>
                  <Th className="pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const emp = empOf(row.employeeId)
                  if (!emp) return null
                  const worked =
                    row.clockIn && row.clockOut
                      ? shiftHours(row.clockIn, row.clockOut)
                      : row.clockIn
                        ? null
                        : 0
                  const variance = formatVariance(row.varianceMinutes)

                  return (
                    <tr key={row.id} className="hover:bg-surface-muted/40">
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-brand/20 text-[10px] font-semibold">
                              {initials(emp.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-3 tabular-nums text-muted-foreground">
                        {row.scheduledStart}–{row.scheduledEnd}
                      </td>
                      <td className="px-3 tabular-nums">{row.clockIn ?? '—'}</td>
                      <td className="px-3 tabular-nums">{row.clockOut ?? (row.clockIn ? '—' : '—')}</td>
                      <td className="px-3 text-right tabular-nums">
                        {worked === null ? 'In progress' : worked === 0 && !row.clockIn ? '—' : `${worked}h`}
                      </td>
                      <td className="px-3">
                        {variance ? (
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              (row.varianceMinutes ?? 0) > 0
                                ? 'bg-warning-tint text-warning'
                                : 'bg-info-tint text-info',
                            )}
                          >
                            {variance}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            statusClass[row.status],
                          )}
                        >
                          {statusLabel[row.status]}
                        </span>
                      </td>
                      <td className="pr-4">
                        {row.needsApproval && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={readOnly}
                            onClick={() => onApprove(row)}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Day view for {todayLabel}. Month heat-map lands with the next attendance iteration.
      </p>
    </>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  )
}
