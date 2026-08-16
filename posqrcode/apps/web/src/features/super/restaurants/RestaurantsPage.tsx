import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertCircle, MoreVertical, RotateCcw, Search, Store, X } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePageState } from '@/hooks/use-page-state'
import { setCurrentRestaurantId, useRestaurants } from '@/hooks/use-restaurants'
import { inr } from '@/lib/currency'
import { getIndustryProfile } from '@/lib/industries-catalog'
import { currentRestaurantId, getPlanById } from '@/lib/mock'
import type { Restaurant } from '@/lib/types'

/** Restaurants data table: toolbar filters (URL params), bulk bar, row menus (doc §6.3). */
export function RestaurantsPage() {
  const state = usePageState()
  const { restaurants, count, setStatus, remove } = useRestaurants()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null)

  const toggleVenueStatus = (r: Restaurant) => {
    const suspending = r.status !== 'suspended'
    setStatus(r.id, suspending ? 'suspended' : 'active')
    toast.success(suspending ? `${r.name} suspended` : `${r.name} activated`, {
      description: suspending
        ? 'Status saved on the venue. Admin portal is read-only when this venue is active.'
        : r.statusBeforeSuspend === 'trial'
          ? 'Trial status restored.'
          : 'Admin writes re-enabled when this venue is active.',
    })
  }

  const q = params.get('q') ?? ''
  const plan = params.get('plan') ?? 'all'
  const status = params.get('status') ?? 'all'
  const sort = params.get('sort') ?? 'newest'

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    let list = restaurants.filter(
      (r) =>
        (plan === 'all' || r.planId === plan) &&
        (status === 'all' || r.status === status) &&
        (q === '' ||
          r.name.toLowerCase().includes(q.toLowerCase()) ||
          r.ownerName.toLowerCase().includes(q.toLowerCase())),
    )
    list = [...list].sort((a, b) =>
      sort === 'newest'
        ? b.createdAt.localeCompare(a.createdAt)
        : sort === 'oldest'
          ? a.createdAt.localeCompare(b.createdAt)
          : a.name.localeCompare(b.name),
    )
    return list
  }, [restaurants, q, plan, status, sort])

  const hasFilters = q !== '' || plan !== 'all' || status !== 'all'
  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id))

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.id)))
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <>
      <PageHeader
        title="Restaurants"
        caption={`${count} venues in this demo · persists in this browser`}
        actions={
          <Button asChild className="rounded-full font-semibold">
            <Link to="/super/restaurants/create">+ Create store</Link>
          </Button>
        }
      />

      {state === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn't load restaurants</AlertTitle>
          <AlertDescription>Something went wrong — please retry.</AlertDescription>
        </Alert>
      )}

      {state !== 'error' && (
        <div className="rounded-card border border-line bg-surface shadow-card">
          {/* Toolbar / bulk bar */}
          {selected.size > 0 ? (
            <div className="flex items-center gap-3 rounded-t-card bg-brand-tint px-4 py-3">
              <p className="text-sm font-semibold">{selected.size} selected</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  selected.forEach((id) => setStatus(id, 'suspended'))
                  toast.success(`${selected.size} restaurants suspended`)
                  setSelected(new Set())
                }}
              >
                Suspend
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  const rows = restaurants.filter((r) => selected.has(r.id))
                  const header = 'id,name,owner,plan,status,mrr,industry\n'
                  const body = rows
                    .map(
                      (r) =>
                        `${r.id},"${r.name}","${r.ownerName}",${r.planId},${r.status},${r.mrr},${r.industryId}`,
                    )
                    .join('\n')
                  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'bear360-venues.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                  toast.success('CSV downloaded')
                }}
              >
                Export
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8"
                onClick={() => setSelected(new Set())}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear selection</span>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setParam('q', e.target.value)}
                  placeholder="Search name or owner…"
                  className="pl-9"
                />
              </div>
              <Select value={plan} onValueChange={(v) => setParam('plan', v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setParam('status', v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setParam('sort', v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Sort: Newest</SelectItem>
                  <SelectItem value="oldest">Sort: Oldest</SelectItem>
                  <SelectItem value="name">Sort: Name</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setParams({}, { replace: true })}
                  title="Reset filters"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {state === 'loading' && (
            <div className="border-t border-line">
              <LoadingSkeleton variant="table-row" count={8} />
            </div>
          )}

          {(state === 'empty' || (state === 'ready' && restaurants.length === 0)) && (
            <EmptyState
              icon={Store}
              title="No venues yet"
              description="Create your first store — it will persist in this browser after setup."
              action={
                <Button asChild className="rounded-full font-semibold">
                  <Link to="/super/restaurants/create">+ Create store</Link>
                </Button>
              }
            />
          )}

          {state === 'ready' && restaurants.length > 0 && filtered.length === 0 && (
            <EmptyState
              icon={Search}
              title={`No matches${q ? ` for "${q}"` : ''}`}
              description="Try different keywords or clear the filters."
              action={
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setParams({}, { replace: true })}
                >
                  Clear filters
                </Button>
              }
            />
          )}

          {state === 'ready' && filtered.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead className="hidden lg:table-cell">Industry</TableHead>
                    <TableHead className="hidden md:table-cell">Owner</TableHead>
                    <TableHead className="hidden sm:table-cell">Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">MRR</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} data-state={selected.has(r.id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={() => toggleOne(r.id)}
                          aria-label={`Select ${r.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {r.emoji} {r.name}
                        </p>
                        <p className="text-xs text-muted-foreground md:hidden">{r.ownerName}</p>
                        <p className="text-xs text-muted-foreground lg:hidden">
                          {getIndustryProfile(r.industryId).name}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {getIndustryProfile(r.industryId).name}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {r.ownerName}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getPlanById(r.planId).name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground lg:table-cell">
                        {inr(r.mrr)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions for {r.name}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/super/restaurants/${r.id}/edit`}>Edit</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setCurrentRestaurantId(r.id)
                                toast.success(`Demo venue pointer → ${r.name}`, {
                                  description:
                                    'Sets plan/status for this browser. Sign in as the restaurant owner at /login to manage — Super session stays here.',
                                  action: {
                                    label: 'Guest menu',
                                    onClick: () =>
                                      window.open(`/r/${r.slug}`, '_blank', 'noopener,noreferrer'),
                                  },
                                })
                              }}
                            >
                              Set as active venue
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                navigator.clipboard?.writeText(
                                  `${window.location.origin}/r/${r.slug}`,
                                )
                                toast.success('QR base URL copied')
                              }}
                            >
                              Copy QR base URL
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-warning focus:text-warning"
                              onSelect={() => toggleVenueStatus(r)}
                            >
                              {r.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-danger focus:text-danger"
                              disabled={r.id === currentRestaurantId}
                              onSelect={() => {
                                if (r.id === currentRestaurantId) {
                                  toast.error('Cannot delete the signed-in demo venue', {
                                    description: 'Suspend it instead, or switch currentRestaurantId in code.',
                                  })
                                  return
                                }
                                setDeleteTarget(r)
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted-foreground">
                <p>
                  Showing 1–{filtered.length} of {hasFilters ? filtered.length : count}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="rounded-full" disabled>
                    ← Prev
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" disabled>
                    Next →
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              Permanently deletes this venue and its menu, tables, orders, and staff from the
              server. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => {
                void (async () => {
                  if (!deleteTarget) return
                  if (deleteTarget.id === currentRestaurantId) {
                    toast.error('Cannot delete the signed-in demo venue')
                    setDeleteTarget(null)
                    return
                  }
                  const name = deleteTarget.name
                  const ok = await remove(deleteTarget.id)
                  setDeleteTarget(null)
                  if (ok) toast.success(`${name} deleted`)
                })()
              }}
            >
              Delete restaurant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
