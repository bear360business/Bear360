import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Send, Trash2 } from 'lucide-react'
import { FeatureGate } from '@/components/app/FeatureGate'
import { PageHeader } from '@/components/app/PageHeader'
import { ShiftCard } from '@/components/app/ShiftCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useStaff } from '@/hooks/use-staff'
import { useShifts } from '@/hooks/use-staff-ops'
import { useStaffRoles } from '@/hooks/use-staff-roles'
import { useTenant } from '@/hooks/use-tenant'
import {
  getRole,
  initials,
  scheduleWeekDays,
  shiftHours,
  weekCoverage,
  weekDayLabels,
} from '@/lib/mock'
import type { Shift, StaffRoleId } from '@/lib/types'
import { cn } from '@/lib/utils'

const TIME_PRESETS: { label: string; start: string; end: string }[] = [
  { label: 'Morning', start: '09:00', end: '18:00' },
  { label: 'Mid', start: '10:00', end: '19:00' },
  { label: 'Kitchen', start: '11:00', end: '20:00' },
  { label: 'Dinner', start: '16:00', end: '23:00' },
  { label: 'Weekend', start: '12:00', end: '22:00' },
]

function defaultTimes(roleId: StaffRoleId): { start: string; end: string } {
  if (roleId === 'waiter') return { start: '16:00', end: '23:00' }
  if (roleId === 'kitchen') return { start: '11:00', end: '20:00' }
  if (roleId === 'manager' || roleId === 'master') return { start: '09:00', end: '18:00' }
  return { start: '10:00', end: '19:00' }
}

function formatDay(date: string) {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

type ShiftDraft = {
  shiftId: string | null
  employeeId: string
  date: string
  start: string
  end: string
  roleId: StaffRoleId
}

function ScheduleContent() {
  const { readOnly } = useTenant()
  const { employees } = useStaff()
  const { roles } = useStaffRoles()
  const { shifts, setShifts } = useShifts()
  const [published, setPublished] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [draft, setDraft] = useState<ShiftDraft | null>(null)

  const roster = useMemo(
    () => employees.filter((e) => e.status !== 'inactive' && e.status !== 'on-leave'),
    [employees],
  )

  const coverageFor = (date: string) => {
    const count = shifts.filter((s) => s.date === date).length
    const base = weekCoverage.find((c) => c.date === date)!
    return {
      ...base,
      staffCount: count,
      understaffed: count < 3 || (base.label === 'Sat' && count < 4),
    }
  }

  const markDirty = () => {
    setDirty(true)
    setPublished(false)
  }

  const openAdd = (employeeId: string, date: string) => {
    if (readOnly) return
    const employee = employees.find((e) => e.id === employeeId)
    if (!employee) return
    const times = defaultTimes(employee.roleId)
    setDraft({
      shiftId: null,
      employeeId,
      date,
      start: times.start,
      end: times.end,
      roleId: employee.roleId,
    })
  }

  const openEdit = (shift: Shift) => {
    if (readOnly) return
    setDraft({
      shiftId: shift.id,
      employeeId: shift.employeeId,
      date: shift.date,
      start: shift.start,
      end: shift.end,
      roleId: shift.roleId,
    })
  }

  const saveDraft = () => {
    if (!draft) return
    if (!draft.start || !draft.end) {
      toast.error('Start and end times are required')
      return
    }
    if (draft.end <= draft.start) {
      toast.error('End time must be after start')
      return
    }
    const hours = shiftHours(draft.start, draft.end)
    if (hours > 12) {
      toast.error('Shift can’t exceed 12 hours')
      return
    }

    if (draft.shiftId) {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === draft.shiftId
            ? { ...s, start: draft.start, end: draft.end, roleId: draft.roleId }
            : s,
        ),
      )
      toast.success('Shift updated')
    } else {
      const next: Shift = {
        id: `sh-${Date.now()}`,
        employeeId: draft.employeeId,
        date: draft.date,
        start: draft.start,
        end: draft.end,
        roleId: draft.roleId,
      }
      setShifts((prev) => [...prev, next])
      toast.success('Shift added')
    }
    markDirty()
    setDraft(null)
  }

  const removeDraft = () => {
    if (!draft?.shiftId) return
    setShifts((prev) => prev.filter((s) => s.id !== draft.shiftId))
    markDirty()
    setDraft(null)
    toast.success('Shift removed')
  }

  const publish = () => {
    const under = scheduleWeekDays.filter((d) => coverageFor(d).understaffed).length
    setPublished(true)
    setDirty(false)
    toast.success('Week published', {
      description:
        under > 0
          ? `${under} day${under === 1 ? '' : 's'} still understaffed vs forecast — team notified.`
          : 'All days meet forecast coverage. Team notified.',
    })
  }

  const draftEmployee = draft ? employees.find((e) => e.id === draft.employeeId) : null
  const draftHours =
    draft && draft.start && draft.end && draft.end > draft.start
      ? shiftHours(draft.start, draft.end)
      : null

  return (
    <>
      <PageHeader
        title="Schedule"
        caption="Week of 3–9 Aug 2026 · tap a cell to add or edit a shift"
        actions={
          <Button disabled={readOnly || (!dirty && published)} onClick={publish}>
            <Send className="mr-1.5 h-4 w-4" />
            {published && !dirty ? 'Published' : 'Publish week'}
          </Button>
        }
      />

      {dirty && (
        <p className="mb-4 rounded-card border border-warning/40 bg-warning-tint/40 px-4 py-2.5 text-sm text-foreground">
          Unpublished changes — publish to notify the team of the new roster.
        </p>
      )}

      <Card className="overflow-hidden rounded-card border-line shadow-card">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted/50">
                <th className="sticky left-0 z-10 w-40 bg-surface-muted/95 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                  Employee
                </th>
                {scheduleWeekDays.map((date, i) => {
                  const cov = coverageFor(date)
                  return (
                    <th key={date} className="min-w-[110px] px-2 py-2 text-left font-normal">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {weekDayLabels[i]}
                      </div>
                      <div
                        className={cn(
                          'mt-1 flex items-center gap-1 text-[11px]',
                          cov.understaffed ? 'text-warning' : 'text-muted-foreground',
                        )}
                      >
                        {cov.understaffed && <AlertTriangle className="h-3 w-3 shrink-0" />}
                        <span>
                          {cov.staffCount} staff · peak {cov.peakLabel}
                          {cov.understaffed ? ' under' : ''}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {roster.map((employee) => (
                <tr key={employee.id}>
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2 backdrop-blur">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-brand/20 text-[10px] font-semibold">
                          {initials(employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium">{employee.name}</span>
                    </div>
                  </td>
                  {scheduleWeekDays.map((date) => {
                    const dayShifts = shifts.filter(
                      (s) => s.employeeId === employee.id && s.date === date,
                    )
                    return (
                      <td key={date} className="px-1.5 py-1.5 align-top">
                        {dayShifts.length > 0 ? (
                          <div className="space-y-1">
                            {dayShifts.map((s) => (
                              <ShiftCard key={s.id} shift={s} onClick={() => openEdit(s)} />
                            ))}
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => openAdd(employee.id, date)}
                                className="flex h-8 w-full items-center justify-center rounded-lg border border-dashed border-line text-[11px] text-muted-foreground transition-colors hover:border-brand hover:bg-brand/10 hover:text-foreground"
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => openAdd(employee.id, date)}
                            className="flex h-12 w-full flex-col items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted-foreground transition-colors hover:border-brand hover:bg-brand/10 hover:text-foreground disabled:opacity-40"
                          >
                            <span className="font-medium">+ Add shift</span>
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Sheet open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>{draft?.shiftId ? 'Edit shift' : 'Add shift'}</SheetTitle>
            <SheetDescription>
              {draftEmployee
                ? `${draftEmployee.name} · ${draft ? formatDay(draft.date) : ''}`
                : 'Set start, end, and role for this day.'}
            </SheetDescription>
          </SheetHeader>

          {draft && (
            <div className="space-y-5 py-6">
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDraft((d) => (d ? { ...d, start: p.start, end: p.end } : d))}
                    className={cn(
                      'rounded-full border border-line px-3 py-1 text-xs font-medium transition-colors hover:bg-surface-muted',
                      draft.start === p.start &&
                        draft.end === p.end &&
                        'border-brand bg-brand-tint font-semibold',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="shift-start">Start</Label>
                  <Input
                    id="shift-start"
                    type="time"
                    value={draft.start}
                    onChange={(e) => setDraft((d) => (d ? { ...d, start: e.target.value } : d))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift-end">End</Label>
                  <Input
                    id="shift-end"
                    type="time"
                    value={draft.end}
                    onChange={(e) => setDraft((d) => (d ? { ...d, end: e.target.value } : d))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Working as</Label>
                <Select
                  value={draft.roleId}
                  onValueChange={(v) =>
                    setDraft((d) => (d ? { ...d, roleId: v as StaffRoleId } : d))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {draftHours != null && (
                <p className="rounded-lg bg-surface-muted/70 px-3 py-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">{draftHours}h</span>{' '}
                  · {getRole(draft.roleId).name}
                </p>
              )}
            </div>
          )}

          <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {draft?.shiftId ? (
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={readOnly}
                onClick={removeDraft}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button className="flex-1 sm:flex-none" disabled={readOnly} onClick={saveDraft}>
                {draft?.shiftId ? 'Save shift' : 'Add shift'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** A15 Scheduler — gated by the `scheduler` sub-feature. */
export function SchedulePage() {
  return (
    <FeatureGate feature="scheduler">
      <ScheduleContent />
    </FeatureGate>
  )
}
