import { useMemo, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { StatusBadge } from '@/components/app/StatusBadge'
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
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createEmployeeDraft, useStaff } from '@/hooks/use-staff'
import { useStaffRoles } from '@/hooks/use-staff-roles'
import { defaultPosPermissionsForRole } from '@/lib/staff-capabilities'
import { isPinTaken, phoneDigits } from '@/lib/staff-access'
import { getRole } from '@/lib/mock'
import type { Employee, PosStaffPermissions, StaffRoleId } from '@/lib/types'

/** POS Staff — PIN credentials + sidebar modules (linked to roster roles). */
export function PosStaffPage() {
  const { employees, upsert, setStatus } = useStaff()
  const { roles } = useStaffRoles()
  const posStaff = useMemo(
    () => employees.filter((e) => e.posAccess || e.pin),
    [employees],
  )
  const rosterWithoutLogin = useMemo(
    () => employees.filter((e) => e.status !== 'inactive' && !e.posAccess),
    [employees],
  )

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    phone: '',
    roleId: 'waiter' as StaffRoleId,
    pin: '',
    perms: defaultPosPermissionsForRole('waiter'),
  })

  const openAdd = () => {
    setEditing(null)
    const first = rosterWithoutLogin[0]
    if (first) {
      setMode('existing')
      setForm({
        employeeId: first.id,
        name: first.name,
        phone: first.phone,
        roleId: first.roleId,
        pin: '',
        perms: defaultPosPermissionsForRole(first.roleId),
      })
    } else {
      setMode('new')
      setForm({
        employeeId: '',
        name: '',
        phone: '',
        roleId: 'waiter',
        pin: '',
        perms: defaultPosPermissionsForRole('waiter'),
      })
    }
    setOpen(true)
  }

  const openEdit = (e: Employee) => {
    setEditing(e)
    setMode('existing')
    setForm({
      employeeId: e.id,
      name: e.name,
      phone: e.phone,
      roleId: e.roleId,
      pin: e.pin ?? '',
      perms: e.posPermissions ?? defaultPosPermissionsForRole(e.roleId),
    })
    setOpen(true)
  }

  const pickExisting = (id: string) => {
    const e = employees.find((x) => x.id === id)
    if (!e) return
    setForm((f) => ({
      ...f,
      employeeId: e.id,
      name: e.name,
      phone: e.phone,
      roleId: e.roleId,
      perms: e.posPermissions ?? defaultPosPermissionsForRole(e.roleId),
    }))
  }

  const setRole = (roleId: StaffRoleId) => {
    setForm((f) => ({
      ...f,
      roleId,
      perms: defaultPosPermissionsForRole(roleId),
    }))
  }

  const save = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Name and mobile are required')
      return
    }
    if (phoneDigits(form.phone).length < 10) {
      toast.error('Enter a valid mobile number')
      return
    }
    if (!/^\d{4,6}$/.test(form.pin)) {
      toast.error('PIN must be 4–6 digits')
      return
    }
    if (isPinTaken(form.pin, employees, editing?.id)) {
      toast.error('PIN already in use', { description: 'Each staff login needs a unique PIN.' })
      return
    }
    if (!form.perms.posTerminal && !form.perms.orders && !form.perms.menu && !form.perms.expenses) {
      toast.error('Enable at least one sidebar module')
      return
    }

    if (editing) {
      upsert({
        ...editing,
        name: form.name.trim(),
        phone: form.phone.trim(),
        roleId: form.roleId,
        pin: form.pin,
        posAccess: true,
        posPermissions: form.perms,
      })
      toast.success(`Updated ${form.name.trim()}`)
    } else if (mode === 'existing' && form.employeeId) {
      const base = employees.find((e) => e.id === form.employeeId)
      if (!base) {
        toast.error('Employee not found')
        return
      }
      upsert({
        ...base,
        name: form.name.trim(),
        phone: form.phone.trim(),
        roleId: form.roleId,
        pin: form.pin,
        posAccess: true,
        posPermissions: form.perms,
      })
      toast.success(`Login enabled for ${form.name.trim()}`)
    } else {
      const next = createEmployeeDraft({
        name: form.name,
        phone: form.phone,
        roleId: form.roleId,
      })
      upsert({
        ...next,
        pin: form.pin,
        posAccess: true,
        posPermissions: form.perms,
      })
      toast.success(`Added ${form.name.trim()}`)
    }
    setOpen(false)
  }

  return (
    <>
      <PageHeader
        title="POS Staff Management"
        caption="Mobile + PIN login. Sidebar modules here; POS actions (pay / void / discount) come from Staff → Roles."
        actions={
          <Button type="button" className="rounded-full" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        }
      />

      <Card className="rounded-card border-line shadow-card">
        <CardContent className="p-0">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold">Active staff logins</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Mobile</th>
                  <th className="px-3 py-3 font-semibold">PIN</th>
                  <th className="px-3 py-3 font-semibold">Access</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {posStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyState
                        icon={Users}
                        title="No staff logins yet"
                        description="Enable mobile + PIN for someone on the roster."
                        action={
                          <Button type="button" onClick={openAdd}>
                            <Plus className="mr-1.5 h-4 w-4" /> Add Member
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  posStaff.map((e) => {
                    const role = getRole(e.roleId)
                    const perms = e.posPermissions
                    const access = [
                      perms?.posTerminal ? 'POS' : null,
                      perms?.orders ? 'Orders' : null,
                      perms?.menu ? 'Menu' : null,
                      perms?.expenses ? 'Finance' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <tr key={e.id} className="hover:bg-surface-muted/40">
                        <td className="px-4 py-3 font-medium">{e.name}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${role.bgClass} ${role.colorClass}`}
                          >
                            {role.name}
                          </span>
                        </td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">{e.phone}</td>
                        <td className="px-3 py-3 tracking-widest text-muted-foreground">••••</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {access || '—'}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={e.status === 'inactive' ? 'inactive' : 'active'} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(e)}>
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setStatus(e.id, 'inactive')
                                upsert({ ...e, posAccess: false })
                                toast.success(`${e.name} login disabled`)
                              }}
                            >
                              Disable
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Staff Login' : 'Enable Staff Login'}</SheetTitle>
            <SheetDescription>
              Sidebar modules for /staff-login. POS pay / void / discount follow their Roles matrix.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!editing && (
              <div className="flex gap-2 rounded-lg border border-line p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm ${mode === 'existing' ? 'bg-brand font-semibold' : 'text-muted-foreground'}`}
                  onClick={() => setMode('existing')}
                  disabled={rosterWithoutLogin.length === 0}
                >
                  From roster
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm ${mode === 'new' ? 'bg-brand font-semibold' : 'text-muted-foreground'}`}
                  onClick={() => setMode('new')}
                >
                  New person
                </button>
              </div>
            )}

            {!editing && mode === 'existing' && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={form.employeeId} onValueChange={pickExisting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {rosterWithoutLogin.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} · {getRole(e.roleId).name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Priya Nair"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile number</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="98765 41002"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
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
              <p className="text-xs text-muted-foreground">
                Changing role resets suggested sidebar modules and drives POS action rights. Create
                new roles under Staff → Roles.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Login PIN</Label>
              <Input
                value={form.pin}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pin: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))
                }
                placeholder="4–6 digits"
                inputMode="numeric"
              />
            </div>

            <div className="rounded-xl border border-line p-4">
              <p className="text-sm font-semibold">Staff sidebar access</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Only enabled modules appear after staff PIN login.
              </p>
              <div className="mt-3 space-y-3">
                {(
                  [
                    ['posTerminal', 'POS'],
                    ['orders', 'Orders'],
                    ['menu', 'Menu items (categories & appearance stay owner-only)'],
                    ['expenses', 'Finance (income needs Manager role)'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <Switch
                      checked={form.perms[key]}
                      onCheckedChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          perms: { ...f.perms, [key]: v } satisfies PosStaffPermissions,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-8">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save Details
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
