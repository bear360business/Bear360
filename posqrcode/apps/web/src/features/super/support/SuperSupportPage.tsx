import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Inbox, LayoutList, LifeBuoy, Send } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import {
  SUPPORT_CATEGORY_META,
  SUPPORT_PRIORITY_META,
  SUPPORT_STATUS_META,
  useSupport,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from '@/hooks/use-support'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12
const ASSIGNEES = ['Anya A.', 'Sam Torres', 'Jin Park'] as const

type StatusFilter = 'active' | 'all' | SupportStatus
type PriorityFilter = 'all' | 'hot' | SupportPriority
type SortKey = 'updated_desc' | 'updated_asc' | 'priority' | 'venue'
type ViewMode = 'inbox' | 'queue'

const PRIORITY_RANK: Record<SupportPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
}

function StatusPill({ status }: { status: SupportTicket['status'] }) {
  const meta = SUPPORT_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        meta.tone === 'info' && 'bg-info-tint text-info',
        meta.tone === 'warning' && 'bg-warning-tint text-warning',
        meta.tone === 'success' && 'bg-success-tint text-success',
        meta.tone === 'muted' && 'bg-surface-muted text-muted-foreground',
      )}
    >
      {meta.label}
    </span>
  )
}

function PriorityDot({ priority }: { priority: SupportPriority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-semibold',
        priority === 'urgent' && 'text-danger',
        priority === 'high' && 'text-warning',
        priority === 'normal' && 'text-muted-foreground',
        priority === 'low' && 'text-muted-foreground/70',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          priority === 'urgent' && 'bg-danger',
          priority === 'high' && 'bg-warning',
          priority === 'normal' && 'bg-info',
          priority === 'low' && 'bg-muted-foreground',
        )}
      />
      {SUPPORT_PRIORITY_META[priority]}
    </span>
  )
}

/** Platform support queue — scales with filters, pagination, inbox + table views. */
export function SuperSupportPage() {
  const { tickets, openCount, reply, setStatus, setPriority, updateTicket, bulkUpdate } =
    useSupport()
  const [view, setView] = useState<ViewMode>('inbox')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [venueFilter, setVenueFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'unassigned' | string>('all')
  const [sort, setSort] = useState<SortKey>('updated_desc')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [replyBody, setReplyBody] = useState('')
  const [noteDraft, setNoteDraft] = useState('')

  const venues = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tickets) map.set(t.restaurantId, t.restaurantName)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [tickets])

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open').length
    const pending = tickets.filter((t) => t.status === 'pending').length
    const urgent = tickets.filter(
      (t) =>
        (t.status === 'open' || t.status === 'pending') &&
        (t.priority === 'urgent' || t.priority === 'high'),
    ).length
    const unassigned = tickets.filter(
      (t) => (t.status === 'open' || t.status === 'pending') && !t.assignee,
    ).length
    return { open, pending, urgent, unassigned, total: tickets.length, active: openCount }
  }, [tickets, openCount])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = tickets.filter((t) => {
      if (statusFilter === 'active') {
        if (t.status !== 'open' && t.status !== 'pending') return false
      } else if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false
      }
      if (priorityFilter === 'hot') {
        if (t.priority !== 'high' && t.priority !== 'urgent') return false
      } else if (priorityFilter !== 'all' && t.priority !== priorityFilter) {
        return false
      }
      if (venueFilter !== 'all' && t.restaurantId !== venueFilter) return false
      if (assigneeFilter === 'unassigned' && t.assignee) return false
      if (
        assigneeFilter !== 'all' &&
        assigneeFilter !== 'unassigned' &&
        t.assignee !== assigneeFilter
      ) {
        return false
      }
      if (
        q &&
        !(
          t.subject.toLowerCase().includes(q) ||
          t.restaurantName.toLowerCase().includes(q) ||
          String(t.number).includes(q) ||
          t.createdByEmail.toLowerCase().includes(q) ||
          (t.assignee ?? '').toLowerCase().includes(q)
        )
      ) {
        return false
      }
      return true
    })

    list = [...list].sort((a, b) => {
      if (sort === 'updated_asc') return a.updatedAt.localeCompare(b.updatedAt)
      if (sort === 'priority') {
        const d = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        return d !== 0 ? d : b.updatedAt.localeCompare(a.updatedAt)
      }
      if (sort === 'venue') {
        const d = a.restaurantName.localeCompare(b.restaurantName)
        return d !== 0 ? d : b.updatedAt.localeCompare(a.updatedAt)
      }
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return list
  }, [tickets, statusFilter, priorityFilter, venueFilter, assigneeFilter, query, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageSlice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => {
    setPage(0)
    setSelectedIds(new Set())
  }, [statusFilter, priorityFilter, venueFilter, assigneeFilter, query, sort, view])

  const selected =
    filtered.find((t) => t.id === selectedId) ??
    tickets.find((t) => t.id === selectedId) ??
    (view === 'inbox' ? pageSlice[0] ?? filtered[0] ?? null : null)

  useEffect(() => {
    if (view === 'inbox' && selected && !selectedId) setSelectedId(selected.id)
  }, [view, selected, selectedId])

  const sendReply = () => {
    if (!selected || !replyBody.trim()) return
    if (selected.status === 'closed') {
      toast.error('Reopen or leave closed — ticket is closed')
      return
    }
    reply({
      ticketId: selected.id,
      authorRole: 'super',
      authorName: 'Bear 360 Support',
      body: replyBody,
      nextStatus: 'pending',
    })
    setReplyBody('')
    toast.success('Reply sent to restaurant')
  }

  const toggleAllPage = () => {
    const ids = pageSlice.map((t) => t.id)
    const allOn = ids.every((id) => selectedIds.has(id))
    setSelectedIds(allOn ? new Set() : new Set(ids))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyBulk = (patch: Partial<Pick<SupportTicket, 'status' | 'assignee'>>) => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    bulkUpdate(ids, patch)
    toast.success(`Updated ${ids.length} ticket${ids.length === 1 ? '' : 's'}`)
    setSelectedIds(new Set())
  }

  const openTicket = (id: string) => {
    setSelectedId(id)
    setNoteDraft('')
    setReplyBody('')
    setView('inbox')
  }

  return (
    <>
      <PageHeader
        title="Support"
        caption={`${stats.active} active across ${venues.length} venues · filter & paginate when volume grows`}
        actions={
          <div className="flex rounded-full bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setView('inbox')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
                view === 'inbox' ? 'bg-surface shadow-card' : 'text-muted-foreground',
              )}
            >
              <Inbox className="h-3.5 w-3.5" /> Inbox
            </button>
            <button
              type="button"
              onClick={() => setView('queue')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
                view === 'queue' ? 'bg-surface shadow-card' : 'text-muted-foreground',
              )}
            >
              <LayoutList className="h-3.5 w-3.5" /> Queue table
            </button>
          </div>
        }
      />

      {/* Volume chips — click to filter */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {(
          [
            {
              key: 'active',
              label: 'Active',
              value: stats.active,
              onClick: () => setStatusFilter('active'),
              active: statusFilter === 'active',
            },
            {
              key: 'open',
              label: 'Open',
              value: stats.open,
              onClick: () => setStatusFilter('open'),
              active: statusFilter === 'open',
            },
            {
              key: 'pending',
              label: 'Awaiting reply',
              value: stats.pending,
              onClick: () => setStatusFilter('pending'),
              active: statusFilter === 'pending',
            },
            {
              key: 'urgent',
              label: 'High / urgent',
              value: stats.urgent,
              onClick: () => {
                setStatusFilter('active')
                setPriorityFilter('hot')
              },
              active: priorityFilter === 'hot',
            },
            {
              key: 'unassigned',
              label: 'Unassigned',
              value: stats.unassigned,
              onClick: () => {
                setStatusFilter('active')
                setAssigneeFilter('unassigned')
              },
              active: assigneeFilter === 'unassigned',
            },
          ] as const
        ).map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onClick}
            className={cn(
              'rounded-card border px-4 py-3 text-left shadow-card transition-colors',
              chip.active
                ? 'border-brand bg-brand-tint'
                : 'border-line bg-surface hover:bg-surface-muted/50',
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {chip.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold">{chip.value}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search #, venue, subject, email…"
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Awaiting restaurant</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="hot">High + urgent</SelectItem>
            {(Object.keys(SUPPORT_PRIORITY_META) as SupportPriority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {SUPPORT_PRIORITY_META[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={venueFilter} onValueChange={setVenueFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Venue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All venues</SelectItem>
            {venues.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={assigneeFilter}
          onValueChange={setAssigneeFilter}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {ASSIGNEES.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_desc">Newest update</SelectItem>
            <SelectItem value="updated_asc">Oldest update</SelectItem>
            <SelectItem value="priority">Priority first</SelectItem>
            <SelectItem value="venue">Venue A–Z</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => {
            setStatusFilter('active')
            setPriorityFilter('all')
            setVenueFilter('all')
            setAssigneeFilter('all')
            setQuery('')
            setSort('updated_desc')
          }}
        >
          Clear filters
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
          {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="p-6">
            <EmptyState
              icon={LifeBuoy}
              title="No tickets match"
              description="Widen filters or clear search — new restaurant tickets land here automatically."
            />
          </CardContent>
        </Card>
      ) : view === 'queue' ? (
        <Card className="rounded-card border-line shadow-card">
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-brand-tint px-4 py-3">
              <p className="text-sm font-semibold">{selectedIds.size} selected</p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => applyBulk({ status: 'resolved' })}
              >
                Mark resolved
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => applyBulk({ status: 'closed' })}
              >
                Close
              </Button>
              <Select
                onValueChange={(v) =>
                  applyBulk({ assignee: v === 'unassigned' ? undefined : v })
                }
              >
                <SelectTrigger className="h-8 w-[160px] rounded-full">
                  <SelectValue placeholder="Assign…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {ASSIGNEES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto rounded-full"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      pageSlice.length > 0 && pageSlice.every((t) => selectedIds.has(t.id))
                    }
                    onCheckedChange={toggleAllPage}
                    aria-label="Select page"
                  />
                </TableHead>
                <TableHead>#</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">Venue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Priority</TableHead>
                <TableHead className="hidden lg:table-cell">Assignee</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSlice.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  data-state={selectedIds.has(t.id) ? 'selected' : undefined}
                  onClick={() => openTicket(t.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={() => toggleOne(t.id)}
                      aria-label={`Select #${t.number}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {t.number}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate font-medium">{t.subject}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {t.restaurantName}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={t.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <PriorityDot priority={t.priority} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {t.assignee ?? '—'}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar
            page={safePage}
            pageCount={pageCount}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="flex flex-col rounded-card border-line shadow-card lg:max-h-[calc(100vh-14rem)]">
            <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
              {pageSlice.map((t) => {
                const active = selected?.id === t.id
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(t.id)
                        setNoteDraft('')
                        setReplyBody('')
                      }}
                      className={cn(
                        'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors',
                        active ? 'bg-brand-tint' : 'hover:bg-surface-muted/60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold">{t.subject}</p>
                        <StatusPill status={t.status} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-medium text-foreground/80">
                          {t.restaurantName}
                        </p>
                        <PriorityDot priority={t.priority} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        #{t.number}
                        {t.assignee ? ` · ${t.assignee}` : ' · Unassigned'} ·{' '}
                        {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
            <PaginationBar
              page={safePage}
              pageCount={pageCount}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            />
          </Card>

          {selected ? (
            <Card className="flex min-h-[420px] flex-col rounded-card border-line shadow-card lg:max-h-[calc(100vh-14rem)]">
              <div className="space-y-3 border-b border-line px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket #{selected.number}</p>
                    <h2 className="font-display text-lg font-bold">{selected.subject}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selected.restaurantName} · {selected.createdByName} ·{' '}
                      {selected.createdByEmail}
                    </p>
                  </div>
                  <StatusPill status={selected.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={selected.status}
                    onValueChange={(v) => {
                      setStatus(selected.id, v as SupportStatus)
                      toast.success('Status updated')
                    }}
                  >
                    <SelectTrigger className="h-9 w-[170px] rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SUPPORT_STATUS_META) as SupportStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {SUPPORT_STATUS_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selected.priority}
                    onValueChange={(v) => {
                      setPriority(selected.id, v as SupportPriority)
                      toast.success('Priority updated')
                    }}
                  >
                    <SelectTrigger className="h-9 w-[140px] rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SUPPORT_PRIORITY_META) as SupportPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {SUPPORT_PRIORITY_META[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="flex h-9 items-center rounded-full bg-surface-muted px-3 text-xs text-muted-foreground">
                    {SUPPORT_CATEGORY_META.find((c) => c.id === selected.category)?.label}
                  </span>
                  <Select
                    value={selected.assignee || 'unassigned'}
                    onValueChange={(v) => {
                      updateTicket(selected.id, {
                        assignee: v === 'unassigned' ? undefined : v,
                      })
                      toast.success(v === 'unassigned' ? 'Unassigned' : `Assigned to ${v}`)
                    }}
                  >
                    <SelectTrigger className="h-9 w-[160px] rounded-full">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {ASSIGNEES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="rounded-full" asChild>
                    <Link to={`/super/restaurants/${selected.restaurantId}/edit`}>Venue →</Link>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={noteDraft || selected.internalNote || ''}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Internal note (not shown to restaurant)"
                    className="h-9"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      updateTicket(selected.id, {
                        internalNote: noteDraft || selected.internalNote,
                      })
                      setNoteDraft('')
                      toast.success('Internal note saved')
                    }}
                  >
                    Save note
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {selected.messages.map((m) => {
                  const mine = m.authorRole === 'super'
                  return (
                    <div
                      key={m.id}
                      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                          mine
                            ? 'bg-ink-900 text-white'
                            : 'border border-line bg-surface-muted/70 text-foreground',
                        )}
                      >
                        <p className="text-[11px] font-semibold opacity-70">
                          {mine ? 'Support (you)' : m.authorName}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        <p className="mt-2 text-[10px] opacity-60">
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {selected.status === 'closed' ? (
                <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
                  <p className="text-sm text-muted-foreground">Ticket closed.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setStatus(selected.id, 'open')
                      toast.success('Ticket reopened')
                    }}
                  >
                    Reopen
                  </Button>
                </div>
              ) : (
                <div className="border-t border-line px-5 py-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Reply to the restaurant…"
                      rows={2}
                      className="min-h-[44px] resize-none"
                    />
                    <Button
                      className="h-auto shrink-0 rounded-xl px-4"
                      disabled={!replyBody.trim()}
                      onClick={sendReply}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => {
                        setStatus(selected.id, 'resolved')
                        toast.success('Marked resolved')
                      }}
                    >
                      Mark resolved
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => {
                        setStatus(selected.id, 'closed')
                        toast.success('Ticket closed')
                      }}
                    >
                      Close ticket
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="rounded-card border-line shadow-card">
              <CardContent className="p-6">
                <EmptyState
                  icon={Inbox}
                  title="Select a ticket"
                  description="Pick from the list, or switch to Queue table for bulk triage."
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}

function PaginationBar({
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  page: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
}) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted-foreground">
      <p>
        Page {page + 1} of {pageCount}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={page <= 0}
          onClick={onPrev}
        >
          ← Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={page >= pageCount - 1}
          onClick={onNext}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}
