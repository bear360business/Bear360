import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { useAuth } from '@/hooks/use-auth'
import { useStaff } from '@/hooks/use-staff'
import { useStaffRoles } from '@/hooks/use-staff-roles'
import { useTenant } from '@/hooks/use-tenant'
import { PERMISSION_LABELS } from '@/lib/mock'
import type { PermissionGrant, PermissionKey, StaffRole, StaffRoleId } from '@/lib/types'
import { cn } from '@/lib/utils'

const FALLBACK_ROLE_ID: StaffRoleId = 'waiter'

const PERMISSIONS = Object.keys(PERMISSION_LABELS) as PermissionKey[]

function isGranted(grant: PermissionGrant): boolean {
  return grant === true || (typeof grant === 'object' && grant.maxPct > 0)
}

function isConditional(grant: PermissionGrant): grant is { maxPct: number } {
  return typeof grant === 'object' && grant !== null && 'maxPct' in grant
}

/** A14 Roles — permission matrix with conditional discount bound (doc §8.5). */
export function RolesPage() {
  const { session } = useAuth()
  const { readOnly } = useTenant()
  const { employees, upsert } = useStaff()
  const {
    roles: storedRoles,
    setRoles: setStoredRoles,
    saveRoles,
    addRole,
    removeRole,
    isBuiltinRole,
  } = useStaffRoles()
  const [roles, setRoles] = useState<StaffRole[]>(() =>
    storedRoles.map((r) => ({ ...r, permissions: { ...r.permissions } })),
  )
  const [baseline, setBaseline] = useState(() =>
    storedRoles.map((r) => ({ ...r, permissions: { ...r.permissions } })),
  )
  const [dirty, setDirty] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [templateId, setTemplateId] = useState<StaffRoleId>('master')
  const [pendingRemove, setPendingRemove] = useState<{
    id: StaffRoleId
    name: string
  } | null>(null)

  // Keep local draft in sync when another screen creates a role.
  useEffect(() => {
    if (dirty) return
    setRoles(storedRoles.map((r) => ({ ...r, permissions: { ...r.permissions } })))
    setBaseline(storedRoles.map((r) => ({ ...r, permissions: { ...r.permissions } })))
  }, [storedRoles, dirty])

  const affectedByRole = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of roles) counts[r.id] = 0
    for (const e of employees) {
      if (e.status !== 'inactive') counts[e.roleId] = (counts[e.roleId] ?? 0) + 1
    }
    return counts
  }, [employees, roles])

  const changedRoles = useMemo(() => {
    if (!dirty) return [] as StaffRoleId[]
    return roles
      .filter((r) => {
        const b = baseline.find((x) => x.id === r.id)
        if (!b) return true
        return PERMISSIONS.some(
          (p) => JSON.stringify(r.permissions[p]) !== JSON.stringify(b.permissions[p]),
        )
      })
      .map((r) => r.id)
  }, [roles, baseline, dirty])

  const affectedPeople = changedRoles.reduce((n, id) => n + (affectedByRole[id] ?? 0), 0)

  const toggle = (roleId: StaffRoleId, key: PermissionKey) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r
        const current = r.permissions[key]
        let next: PermissionGrant
        if (key === 'applyDiscount') {
          next = isGranted(current) ? false : { maxPct: isConditional(current) ? current.maxPct : 10 }
        } else {
          next = !isGranted(current)
        }
        return { ...r, permissions: { ...r.permissions, [key]: next } }
      }),
    )
    setDirty(true)
  }

  const setDiscountCap = (roleId: StaffRoleId, maxPct: number) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? { ...r, permissions: { ...r.permissions, applyDiscount: { maxPct } } }
          : r,
      ),
    )
    setDirty(true)
  }

  const save = () => {
    saveRoles(roles)
    setStoredRoles(roles)
    setBaseline(roles.map((r) => ({ ...r, permissions: { ...r.permissions } })))
    setDirty(false)
    toast.success('Roles updated', {
      description:
        affectedPeople > 0
          ? `POS actions update for ${affectedPeople} ${affectedPeople === 1 ? 'person' : 'people'} on next ticket.`
          : 'Saved — applies on the POS terminal.',
    })
  }

  const reset = () => {
    setRoles(baseline.map((r) => ({ ...r, permissions: { ...r.permissions } })))
    setDirty(false)
  }

  const createRole = () => {
    const result = addRole(newName, templateId)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setDirty(false)
    setAddOpen(false)
    setNewName('')
    toast.success(`${result.role.name} added`, {
      description: 'Adjust permissions below, then Save changes if you edit the matrix.',
    })
  }

  const requestRemoveRole = (roleId: StaffRoleId, roleName: string) => {
    if (dirty) {
      toast.error('Save or discard permission changes first')
      return
    }
    if (isBuiltinRole(roleId)) {
      toast.error('Built-in roles can’t be removed')
      return
    }
    setPendingRemove({ id: roleId, name: roleName })
  }

  const confirmRemoveRole = () => {
    if (!pendingRemove) return
    const { id: roleId, name: roleName } = pendingRemove
    const assigned = employees.filter((e) => e.roleId === roleId)
    for (const e of assigned) {
      upsert({ ...e, roleId: FALLBACK_ROLE_ID })
    }
    const result = removeRole(roleId)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setRoles((prev) => prev.filter((r) => r.id !== roleId))
    setBaseline((prev) => prev.filter((r) => r.id !== roleId))
    setPendingRemove(null)
    toast.success(`${roleName} removed`, {
      description:
        assigned.length > 0
          ? `${assigned.length} employee${assigned.length === 1 ? '' : 's'} moved to Waiter`
          : undefined,
    })
  }

  // Restaurant owner/admin only — same gate as Categories / Appearance.
  if (session?.role === 'staff') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        caption="Enforced on the POS terminal — take orders, payments, discounts, and void. Module sidebar access is under POS Staff."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={readOnly}
              onClick={() => {
                setNewName('')
                setTemplateId(
                  roles.some((r) => r.id === 'master') ? 'master' : (roles[0]?.id ?? 'manager'),
                )
                setAddOpen(true)
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add role
            </Button>
            {dirty && (
              <>
                {affectedPeople > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Affects <span className="font-semibold text-foreground">{affectedPeople}</span>{' '}
                    {affectedPeople === 1 ? 'person' : 'people'}
                  </span>
                )}
                <Button variant="ghost" disabled={readOnly} onClick={reset}>
                  Discard
                </Button>
                <Button disabled={readOnly} onClick={save}>
                  Save changes
                </Button>
              </>
            )}
          </div>
        }
      />

      <Card className="rounded-card border-line shadow-card">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Permission</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-3 py-3 text-center font-medium">
                    <div className="inline-flex items-center justify-center gap-1">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs',
                          role.bgClass,
                          role.colorClass,
                        )}
                      >
                        {role.name}
                      </span>
                      {!isBuiltinRole(role.id) && (
                        <button
                          type="button"
                          disabled={readOnly}
                          title={`Remove ${role.name}`}
                          aria-label={`Remove ${role.name}`}
                          onClick={() => requestRemoveRole(role.id, role.name)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PERMISSIONS.map((key) => (
                <tr key={key}>
                  <td className="px-4 py-3">
                    <Label className="font-normal">{PERMISSION_LABELS[key]}</Label>
                  </td>
                  {roles.map((role) => {
                    const grant = role.permissions[key]
                    const on = isGranted(grant)
                    return (
                      <td key={role.id} className="px-3 py-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <Checkbox
                            checked={on}
                            disabled={readOnly}
                            onCheckedChange={() => toggle(role.id, key)}
                            aria-label={`${role.name} ${PERMISSION_LABELS[key]}`}
                          />
                          {key === 'applyDiscount' && on && isConditional(grant) && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="text-[10px] font-semibold text-muted-foreground underline"
                                  disabled={readOnly}
                                >
                                  max {grant.maxPct}%
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-40 p-3">
                                <Label htmlFor={`cap-${role.id}`} className="text-xs">
                                  Max discount %
                                </Label>
                                <Input
                                  id={`cap-${role.id}`}
                                  type="number"
                                  min={1}
                                  max={100}
                                  className="mt-1 h-8"
                                  value={grant.maxPct}
                                  onChange={(e) =>
                                    setDiscountCap(
                                      role.id,
                                      Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                                    )
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog
        open={!!pendingRemove}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {pendingRemove?.name}?</DialogTitle>
            <DialogDescription>
              {(affectedByRole[pendingRemove?.id ?? ''] ?? 0) > 0
                ? `This role is assigned to ${affectedByRole[pendingRemove!.id]} employee${
                    affectedByRole[pendingRemove!.id] === 1 ? '' : 's'
                  }. They’ll be moved to Waiter, then the role is deleted.`
                : 'This custom role will be deleted from the permissions matrix.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingRemove(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmRemoveRole}>
              Remove role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add role</SheetTitle>
            <SheetDescription>
              One place to add roles (Master is already built-in). Permissions start from a template
              — edit the matrix after create.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role name</Label>
              <Input
                id="role-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Supervisor"
              />
            </div>
            <div className="space-y-2">
              <Label>Copy permissions from</Label>
              <Select value={templateId} onValueChange={(v) => setTemplateId(v)}>
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
          </div>
          <SheetFooter className="mt-8">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={readOnly} onClick={createRole}>
              Create role
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
