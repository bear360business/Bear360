import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, LayoutGrid, List, Plus, Search, Trash2, UserX, Users } from 'lucide-react'
import { EmployeeCard } from '@/components/app/EmployeeCard'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { UsageMeter } from '@/components/app/UsageMeter'
import { useUpgrade } from '@/components/app/UpgradeDrawer'
import { ConfirmDeleteDialog } from '@/components/app/ConfirmDeleteDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { StatusBadge } from '@/components/app/StatusBadge'
import { createEmployeeDraft, defaultHourlyRate, useStaff } from '@/hooks/use-staff'
import { useStaffRoles } from '@/hooks/use-staff-roles'
import { useTenant } from '@/hooks/use-tenant'
import { getRole, initials } from '@/lib/mock'
import type { Employee, EmployeeStatus, StaffRoleId } from '@/lib/types'
import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'list'

type StaffForm = {
  name: string
  phone: string
  email: string
  roleId: StaffRoleId
  hourlyRate: string
  status: EmployeeStatus
}

const emptyForm = (): StaffForm => ({
  name: '',
  phone: '',
  email: '',
  roleId: 'waiter',
  hourlyRate: String(defaultHourlyRate('waiter')),
  status: 'active',
})

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function isValidPhone(value: string) {
  const digits = digitsOnly(value)
  return digits.length >= 10 && digits.length <= 13
}

/** A13 Employees — grid/list, seat meter, add sheet (doc §8.5). */
export function StaffPage() {
  const { readOnly, limit } = useTenant()
  const { openUpgrade } = useUpgrade()
  const { employees: people, upsert, setStatus, remove } = useStaff()
  const { roles } = useStaffRoles()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [view, setView] = useState<ViewMode>('grid')
  const [drawer, setDrawer] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null,
  })
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [form, setForm] = useState<StaffForm>(emptyForm)

  const seats = limit('staffSeats')
  const activeSeats = people.filter((e) => e.status !== 'inactive').length
  const atSeatLimit = seats.max !== null && activeSeats >= seats.max

  const filtered = useMemo(
    () =>
      people.filter(
        (e) =>
          (roleFilter === 'all' || e.roleId === roleFilter) &&
          (query === '' ||
            e.name.toLowerCase().includes(query.toLowerCase()) ||
            e.phone.includes(query) ||
            (e.email?.toLowerCase().includes(query.toLowerCase()) ?? false)),
      ),
    [people, query, roleFilter],
  )

  const openAdd = () => {
    // Always open the add form — seat limit is a soft warning, not a subscription gate.
    setForm(emptyForm())
    setDrawer({ open: true, employee: null })
  }

  const openEdit = (employee: Employee) => {
    setForm({
      name: employee.name,
      phone: employee.phone,
      email: employee.email ?? '',
      roleId: employee.roleId,
      hourlyRate: String(employee.hourlyRate),
      status: employee.status,
    })
    setDrawer({ open: true, employee })
  }

  const setRole = (roleId: StaffRoleId) => {
    setForm((f) => {
      const prevDefault = defaultHourlyRate(f.roleId)
      const currentRate = Number(f.hourlyRate)
      const keepCustom = f.hourlyRate !== '' && currentRate > 0 && currentRate !== prevDefault
      return {
        ...f,
        roleId,
        hourlyRate: keepCustom ? f.hourlyRate : String(defaultHourlyRate(roleId)),
      }
    })
  }

  const save = () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!isValidPhone(form.phone)) {
      toast.error('Enter a valid phone number', {
        description: 'Use 10–13 digits, e.g. +91 98765 43210.',
      })
      return
    }
    const rate = Number(form.hourlyRate)
    if (!rate || rate <= 0) {
      toast.error('Hourly rate must be greater than 0')
      return
    }
    const phone = form.phone.trim()
    const duplicate = people.some(
      (e) => e.id !== drawer.employee?.id && digitsOnly(e.phone) === digitsOnly(phone),
    )
    if (duplicate) {
      toast.error('Phone already on the roster')
      return
    }

    if (drawer.employee) {
      upsert({
        ...drawer.employee,
        name: form.name.trim(),
        phone,
        email: form.email.trim() || undefined,
        roleId: form.roleId,
        hourlyRate: rate,
        status: form.status,
      })
      toast.success(`Updated ${form.name.trim()}`)
    } else {
      const next = createEmployeeDraft({
        name: form.name,
        phone,
        email: form.email,
        roleId: form.roleId,
        hourlyRate: rate,
      })
      upsert({
        ...next,
        status: form.status,
      })
      toast.success(`${next.name} added`, {
        description: 'They’ll show on Schedule and Payroll.',
      })
    }
    setDrawer({ open: false, employee: null })
  }

  const activate = (employee: Employee) => {
    setStatus(employee.id, 'active')
    upsert({ ...employee, status: 'active' })
    toast.success(`${employee.name} reactivated`)
  }

  const deactivate = (employee: Employee) => {
    setStatus(employee.id, 'inactive')
    upsert({ ...employee, status: 'inactive' })
    toast.success(`${employee.name} deactivated`)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    remove(deleteTarget.id)
    toast.success(`${deleteTarget.name} removed from roster`)
    if (drawer.employee?.id === deleteTarget.id) {
      setDrawer({ open: false, employee: null })
    }
    setDeleteTarget(null)
  }

  return (
    <>
      <PageHeader
        title="Staff"
        caption={`${people.filter((e) => e.status !== 'inactive').length} on the roster`}
        actions={
          <Button disabled={readOnly} onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add employee
          </Button>
        }
      />

      <Card className="mb-4 rounded-card border-line shadow-card">
        <CardContent className="p-4">
          <UsageMeter
            limitKey="staffSeats"
            state={{ ...seats, used: activeSeats }}
            action={
              atSeatLimit ? (
                <Button size="sm" variant="outline" onClick={() => openUpgrade('staff')}>
                  Upgrade
                </Button>
              ) : undefined
            }
          />
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex rounded-lg border border-line p-0.5">
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => setView('grid')}
            className={cn(
              'rounded-md p-2 transition-colors',
              view === 'grid' ? 'bg-brand text-foreground' : 'text-muted-foreground hover:bg-surface-muted',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="List view"
            onClick={() => setView('list')}
            className={cn(
              'rounded-md p-2 transition-colors',
              view === 'list' ? 'bg-brand text-foreground' : 'text-muted-foreground hover:bg-surface-muted',
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={Users}
            title={query || roleFilter !== 'all' ? 'No employees match' : 'No employees yet'}
            description={
              query || roleFilter !== 'all'
                ? 'Try a different search or clear the filters.'
                : 'Add your team to schedule shifts and track attendance.'
            }
            action={
              query || roleFilter !== 'all' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('')
                    setRoleFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button disabled={readOnly} onClick={openAdd}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add employee
                </Button>
              )
            }
          />
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              readOnly={readOnly}
              onEdit={openEdit}
              onActivate={activate}
              onDeactivate={deactivate}
              onDelete={(emp) => setDeleteTarget(emp)}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted/50 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Employee
                  </th>
                  <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Role
                  </th>
                  <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Phone
                  </th>
                  <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Shift today
                  </th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((employee) => {
                  const role = getRole(employee.roleId)
                  const isInactive = employee.status === 'inactive'
                  return (
                    <tr key={employee.id} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-brand/20 text-xs font-semibold">
                              {initials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 sm:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            role.bgClass,
                            role.colorClass,
                          )}
                        >
                          {role.name}
                        </span>
                      </td>
                      <td className="hidden px-3 tabular-nums text-muted-foreground md:table-cell">
                        {employee.phone}
                      </td>
                      <td className="hidden px-3 tabular-nums text-muted-foreground lg:table-cell">
                        {employee.shiftToday ?? 'Off'}
                      </td>
                      <td className="px-3">
                        <StatusBadge status={employee.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={readOnly}
                            onClick={() => openEdit(employee)}
                          >
                            Edit
                          </Button>
                          {isInactive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={readOnly}
                              className="h-8 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500 text-xs font-semibold"
                              onClick={() => activate(employee)}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Activate
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={readOnly}
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => deactivate(employee)}
                            >
                              <UserX className="mr-1 h-3.5 w-3.5" />
                              Deactivate
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={readOnly}
                            className="h-8 w-8 text-danger hover:bg-danger/10 hover:text-danger"
                            onClick={() => setDeleteTarget(employee)}
                            title="Delete employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Sheet open={drawer.open} onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[440px]">
          <SheetHeader>
            <SheetTitle>{drawer.employee ? `Edit ${drawer.employee.name}` : 'Add employee'}</SheetTitle>
            <SheetDescription>
              {drawer.employee
                ? 'Update contact details, role, and pay rate.'
                : 'Add someone to the roster for scheduling and payroll.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 py-6">
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Identity
              </p>
              <div className="space-y-2">
                <Label htmlFor="emp-name">Full name</Label>
                <Input
                  id="emp-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Priya Nair"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-phone">Phone</Label>
                <Input
                  id="emp-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-email">
                  Email <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@venue.com"
                />
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role & pay
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Role</Label>
                  <Link
                    to="/staff/roles"
                    className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => setDrawer({ open: false, employee: null })}
                  >
                    Manage roles →
                  </Link>
                </div>
                <Select value={form.roleId} onValueChange={(v) => setRole(v as StaffRoleId)}>
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
              <div className="space-y-2">
                <Label htmlFor="emp-rate">Hourly rate (₹)</Label>
                <Input
                  id="emp-rate"
                  type="number"
                  min={1}
                  step={10}
                  value={form.hourlyRate}
                  onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Suggested for {getRole(form.roleId).name}: ₹{defaultHourlyRate(form.roleId)}/h —
                  used in Payroll.
                </p>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 bg-surface-muted/20">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium">Active Status</span>
                  <p className="text-xs text-muted-foreground">
                    Inactive staff are excluded from active seat counts and shifts
                  </p>
                </div>
                <Switch
                  checked={form.status !== 'inactive'}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, status: checked ? 'active' : 'inactive' }))
                  }
                />
              </label>
            </section>

            {!drawer.employee && atSeatLimit && seats.max != null && (
              <p className="rounded-lg border border-warning/40 bg-warning-tint/40 px-3 py-2 text-xs text-foreground">
                Plan seat limit is {seats.max} — you already have {activeSeats}. You can still add
                for this demo; upgrade from the seats meter anytime.
              </p>
            )}
          </div>
          <SheetFooter className="gap-2 sm:justify-between">
            {drawer.employee ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-danger hover:text-danger hover:bg-danger/10"
                disabled={readOnly}
                onClick={() => setDeleteTarget(drawer.employee)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete employee
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setDrawer({ open: false, employee: null })}>
                Cancel
              </Button>
              <Button className="rounded-full" disabled={readOnly} onClick={save}>
                {drawer.employee ? 'Save changes' : 'Add to roster'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.name}?`}
        description={`Are you sure you want to delete ${deleteTarget?.name}? This will permanently remove them from the roster, schedules, and payroll.`}
        confirmText="Delete employee"
      />
    </>
  )
}
