import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { useRestaurants } from '@/hooks/use-restaurants'
import type { AdminUiFlags, CustomerUiFlags, ServiceFlags } from '@/lib/platform-config'
import {
  DEFAULT_SUPER_SETTINGS,
  readSuperSettings,
  writeSuperSettings,
  type SuperSettings,
  type SuperTeamMember,
  type SuperTeamRole,
} from '@/lib/super-settings'
import { PageHeader } from '@/components/app/PageHeader'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const notificationRows: { id: keyof SuperSettings['notifications']; label: string }[] = [
  { id: 'new-restaurant', label: 'New restaurant sign-ups' },
  { id: 'trial-expiry', label: 'Trial expiry warnings' },
  { id: 'weekly-digest', label: 'Weekly platform digest' },
  { id: 'billing-failures', label: 'Billing failures' },
]

const serviceRows: { key: keyof ServiceFlags; label: string; caption: string }[] = [
  {
    key: 'onlineOrdering',
    label: 'Online ordering',
    caption: 'Customers can place orders from table QRs. Off = menus become browse-only.',
  },
  {
    key: 'kitchenDisplay',
    label: 'Kitchen display',
    caption: 'Full-screen KDS for restaurant staff (sidebar item + /kitchen).',
  },
]

const customerUiRows: { key: keyof CustomerUiFlags; label: string; caption: string }[] = [
  { key: 'showItemImages', label: 'Dish photos', caption: 'Food photography on the customer menu.' },
  {
    key: 'showVegSpiceBadges',
    label: 'Veg & spice badges',
    caption: 'Veg/non-veg marks and 🌶 indicators on dishes.',
  },
  { key: 'showRatings', label: 'Restaurant rating', caption: '★ rating in the landing hero.' },
  {
    key: 'showLiveTracking',
    label: 'Live order tracking',
    caption: 'Placed → Preparing → Ready tracker on the success screen.',
  },
  {
    key: 'showPoweredBy',
    label: '“Powered by Bear 360”',
    caption: 'Platform branding on customer screens.',
  },
]

const adminUiRows: { key: keyof AdminUiFlags; label: string; caption: string }[] = [
  { key: 'showReports', label: 'Reports', caption: 'Reports section in the restaurant admin portal.' },
  {
    key: 'showRevenueStats',
    label: 'Revenue & sales charts',
    caption: 'Revenue stat card and sales chart on the admin dashboard.',
  },
  {
    key: 'showActivityFeed',
    label: 'Activity feed',
    caption: 'Recent-activity list on the admin dashboard.',
  },
]

function FlagRow({
  label,
  caption,
  checked,
  onChange,
}: {
  label: string
  caption: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </li>
  )
}

/** Platform settings: tabs + dirty-state save footer (doc §6.6). */
export function SuperSettingsPage() {
  const { config, setFlag, reset } = usePlatformConfig()
  const { restaurants, setStatus } = useRestaurants()
  const [draft, setDraft] = useState<SuperSettings>(() => readSuperSettings())
  const [dirty, setDirty] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    setDraft(readSuperSettings())
  }, [])

  const patch = (updater: (prev: SuperSettings) => SuperSettings) => {
    setDraft((prev) => updater(prev))
    setDirty(true)
  }

  const save = () => {
    writeSuperSettings(draft)
    toast.success('Settings saved', { description: 'Team, billing defaults, and notifications.' })
    setDirty(false)
  }

  const discard = () => {
    setDraft(readSuperSettings())
    setDirty(false)
  }

  const suspendAllTrials = () => {
    const trials = restaurants.filter((r) => r.status === 'trial')
    if (trials.length === 0) {
      toast.message('No trial venues to suspend')
      return
    }
    trials.forEach((r) => setStatus(r.id, 'suspended'))
    toast.success(`${trials.length} trial venue${trials.length === 1 ? '' : 's'} suspended`, {
      description: 'They restore to trial when you Activate them again.',
    })
  }

  const inviteMember = () => {
    const email = inviteEmail.trim().toLowerCase()
    const name = inviteName.trim()
    if (!name || !email.includes('@')) {
      toast.error('Enter a name and valid email')
      return
    }
    if (draft.team.some((m) => m.email === email)) {
      toast.error('That email is already on the team')
      return
    }
    const member: SuperTeamMember = {
      id: `tm_${Date.now().toString(36)}`,
      name,
      email,
      role: 'support',
    }
    patch((prev) => ({ ...prev, team: [...prev.team, member] }))
    setInviteName('')
    setInviteEmail('')
    toast.success(`Invited ${name}`, { description: 'Save changes to persist.' })
  }

  return (
    <>
      <PageHeader title="Settings" caption="Platform controls apply live · other tabs save below" />
      <Tabs defaultValue="controls">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="controls">Platform controls</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="billing">Billing defaults</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="controls">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">Dynamic service & UI controls</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Changes apply instantly to the customer app and restaurant admin portal — no
                    save needed.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={() => {
                    reset()
                    toast.success('Platform controls reset to defaults')
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>

              <h4 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Services
              </h4>
              <ul className="mt-1 divide-y divide-line">
                {serviceRows.map((row) => (
                  <FlagRow
                    key={row.key}
                    label={row.label}
                    caption={row.caption}
                    checked={config.service[row.key]}
                    onChange={(v) => setFlag('service', row.key, v)}
                  />
                ))}
              </ul>

              <h4 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Customer app
              </h4>
              <ul className="mt-1 divide-y divide-line">
                {customerUiRows.map((row) => (
                  <FlagRow
                    key={row.key}
                    label={row.label}
                    caption={row.caption}
                    checked={config.customerUi[row.key]}
                    onChange={(v) => setFlag('customerUi', row.key, v)}
                  />
                ))}
              </ul>

              <h4 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Restaurant admin portal
              </h4>
              <ul className="mt-1 divide-y divide-line">
                {adminUiRows.map((row) => (
                  <FlagRow
                    key={row.key}
                    label={row.label}
                    caption={row.caption}
                    checked={config.adminUi[row.key]}
                    onChange={(v) => setFlag('adminUi', row.key, v)}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="p-8">
              <h3 className="text-base font-semibold">Platform identity</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform name</Label>
                  <Input
                    id="platform-name"
                    value={draft.identity.platformName}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        identity: { ...prev.identity, platformName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-email">Support email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={draft.identity.supportEmail}
                    onChange={(e) =>
                      patch((prev) => ({
                        ...prev,
                        identity: { ...prev.identity, supportEmail: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Logo</Label>
                <label className="mt-2 flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-muted-foreground transition-colors hover:border-brand hover:text-foreground">
                  {draft.identity.logoDataUrl ? (
                    <img
                      src={draft.identity.logoDataUrl}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <>
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-[10px] font-medium">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () =>
                        patch((prev) => ({
                          ...prev,
                          identity: {
                            ...prev.identity,
                            logoDataUrl: String(reader.result),
                          },
                        }))
                      reader.readAsDataURL(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>

              <div className="my-6 h-px bg-line" />

              <h3 className="text-sm font-semibold text-danger">Danger zone</h3>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-danger/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Suspend all trials</p>
                  <p className="text-xs text-muted-foreground">
                    Locks every trial restaurant&apos;s admin portal immediately.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-full border-danger/40 text-danger hover:bg-danger-tint hover:text-danger"
                  onClick={suspendAllTrials}
                >
                  Suspend…
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="p-8">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <h3 className="text-base font-semibold">Team members</h3>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      className="h-9 w-36"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      className="h-9 w-48"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@bear360.app"
                    />
                  </div>
                  <Button variant="outline" className="rounded-full" onClick={inviteMember}>
                    + Invite
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.team.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(role) =>
                            patch((prev) => ({
                              ...prev,
                              team: prev.team.map((m) =>
                                m.id === member.id
                                  ? { ...m, role: role as SuperTeamRole }
                                  : m,
                              ),
                            }))
                          }
                          disabled={member.role === 'owner'}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:text-danger"
                          disabled={member.role === 'owner'}
                          onClick={() =>
                            patch((prev) => ({
                              ...prev,
                              team: prev.team.filter((m) => m.id !== member.id),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="p-8">
              <h3 className="text-base font-semibold">Billing defaults</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Default trial length</Label>
                  <Select
                    value={draft.billing.trialDays}
                    onValueChange={(v) =>
                      patch((prev) => ({
                        ...prev,
                        billing: {
                          ...prev.billing,
                          trialDays: v as SuperSettings['billing']['trialDays'],
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={draft.billing.currency}
                    onValueChange={(v) =>
                      patch((prev) => ({
                        ...prev,
                        billing: {
                          ...prev.billing,
                          currency: v as SuperSettings['billing']['currency'],
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inr">INR ₹</SelectItem>
                      <SelectItem value="usd">USD $</SelectItem>
                      <SelectItem value="eur">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="max-w-[720px] rounded-card border-line shadow-card">
            <CardContent className="p-8">
              <h3 className="mb-2 text-base font-semibold">Email notifications</h3>
              <ul className="divide-y divide-line">
                {notificationRows.map((row) => (
                  <li key={row.id} className="flex h-12 items-center justify-between">
                    <span className="text-sm">{row.label}</span>
                    <Switch
                      checked={draft.notifications[row.id]}
                      onCheckedChange={(on) =>
                        patch((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, [row.id]: on },
                        }))
                      }
                    />
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 rounded-full"
                onClick={() => {
                  writeSuperSettings(DEFAULT_SUPER_SETTINGS)
                  setDraft(readSuperSettings())
                  setDirty(false)
                  toast.success('Super settings reset')
                }}
              >
                Reset all saved settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-content items-center justify-end gap-3 px-6 py-3">
            <p className="mr-auto text-sm text-muted-foreground">You have unsaved changes</p>
            <Button variant="ghost" className="rounded-full" onClick={discard}>
              Discard
            </Button>
            <Button className="rounded-full font-semibold" onClick={save}>
              Save changes
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
