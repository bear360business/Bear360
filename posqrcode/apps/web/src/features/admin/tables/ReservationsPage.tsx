import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  Check,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useTables } from '@/hooks/use-tables'
import { useTenant } from '@/hooks/use-tenant'
import { RESERVATION_TODAY, TIME_SLOTS } from '@/lib/mock'
import type { Reservation, ReservationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type DayFilter = 'today' | 'tomorrow' | 'all'
type StatusFilter = 'all' | 'booked' | 'seated' | 'done'

const statusStyle: Record<ReservationStatus, string> = {
  pending: 'bg-warning-tint text-warning',
  confirmed: 'bg-info-tint text-info',
  seated: 'bg-success-tint text-success',
  'no-show': 'bg-danger-tint text-danger',
  cancelled: 'bg-surface-muted text-muted-foreground',
}

const statusLabel: Record<ReservationStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  seated: 'Seated',
  'no-show': 'No-show',
  cancelled: 'Cancelled',
}

const emptyForm = {
  guestName: '',
  phone: '',
  partySize: '2',
  date: RESERVATION_TODAY,
  time: '19:30',
  durationMinutes: '90',
  tableId: 'none',
  occasion: '',
  note: '',
}

/** Reservation book — day list, assign table, seat / no-show / cancel. */
export function ReservationsPage() {
  const { readOnly } = useTenant()
  const {
    tables,
    reservations: book,
    saveReservation,
    setReservationStatus,
    seatReservation,
  } = useTables()
  const [day, setDay] = useState<DayFilter>('today')
  const [status, setStatus] = useState<StatusFilter>('booked')
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<{ open: boolean; reservation: Reservation | null }>({
    open: false,
    reservation: null,
  })
  const [form, setForm] = useState(emptyForm)

  const tomorrow = '2026-08-08'

  const filtered = useMemo(() => {
    return book
      .filter((r) => {
        if (day === 'today' && r.date !== RESERVATION_TODAY) return false
        if (day === 'tomorrow' && r.date !== tomorrow) return false
        if (status === 'booked' && r.status !== 'pending' && r.status !== 'confirmed') return false
        if (status === 'seated' && r.status !== 'seated') return false
        if (status === 'done' && r.status !== 'no-show' && r.status !== 'cancelled') return false
        if (
          query &&
          !r.guestName.toLowerCase().includes(query.toLowerCase()) &&
          !r.phone.includes(query)
        ) {
          return false
        }
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  }, [book, day, status, query])

  const stats = useMemo(() => {
    const today = book.filter((r) => r.date === RESERVATION_TODAY)
    return {
      covers: today
        .filter((r) => r.status === 'pending' || r.status === 'confirmed' || r.status === 'seated')
        .reduce((n, r) => n + r.partySize, 0),
      booked: today.filter((r) => r.status === 'pending' || r.status === 'confirmed').length,
      seated: today.filter((r) => r.status === 'seated').length,
    }
  }, [book])

  const assignableTables = tables.filter(
    (t) => t.status === 'free' || t.status === 'reserved',
  )

  const openAdd = () => {
    setForm(emptyForm)
    setDrawer({ open: true, reservation: null })
  }

  const openEdit = (reservation: Reservation) => {
    setForm({
      guestName: reservation.guestName,
      phone: reservation.phone,
      partySize: String(reservation.partySize),
      date: reservation.date,
      time: reservation.time,
      durationMinutes: String(reservation.durationMinutes),
      tableId: reservation.tableId ?? 'none',
      occasion: reservation.occasion ?? '',
      note: reservation.note ?? '',
    })
    setDrawer({ open: true, reservation })
  }

  const save = () => {
    if (!form.guestName.trim() || !form.phone.trim()) {
      toast.error('Guest name and phone are required')
      return
    }
    const partySize = Math.max(1, Number(form.partySize) || 1)
    const tableId = form.tableId === 'none' ? undefined : form.tableId
    const payload = {
      guestName: form.guestName.trim(),
      phone: form.phone.trim(),
      partySize,
      date: form.date,
      time: form.time,
      durationMinutes: Math.max(30, Number(form.durationMinutes) || 90),
      tableId,
      occasion: form.occasion.trim() || undefined,
      note: form.note.trim() || undefined,
      status: (tableId ? 'confirmed' : 'pending') as ReservationStatus,
    }

    if (drawer.reservation) {
      saveReservation({ ...drawer.reservation, ...payload })
      toast.success(`Updated ${payload.guestName}`)
    } else {
      const next: Reservation = {
        id: `res-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
      }
      saveReservation(next)
      toast.success(`Booked ${next.guestName} for ${next.time}`)
    }
    setDrawer({ open: false, reservation: null })
  }

  const setStatusOf = (id: string, next: ReservationStatus) => {
    setReservationStatus(id, next)
    const labels: Record<ReservationStatus, string> = {
      pending: 'Marked pending',
      confirmed: 'Confirmed',
      seated: 'Guests seated',
      'no-show': 'Marked no-show',
      cancelled: 'Reservation cancelled',
    }
    toast.success(labels[next])
  }

  const confirm = (r: Reservation) => setStatusOf(r.id, 'confirmed')
  const seat = (r: Reservation) => {
    if (!r.tableId) {
      toast.error('Assign a table before seating')
      openEdit(r)
      return
    }
    seatReservation(r.id)
    toast.success('Guests seated')
  }

  return (
    <>
      <PageHeader
        title="Reservations"
        caption={`Today · ${stats.booked} booked · ${stats.seated} seated · ${stats.covers} covers`}
        actions={
          <Button className="rounded-full font-semibold" disabled={readOnly} onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> New reservation
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Covers today', value: String(stats.covers), icon: Users },
          { label: 'Awaiting', value: String(stats.booked), icon: CalendarDays },
          { label: 'Seated', value: String(stats.seated), icon: Check },
        ].map((s) => (
          <Card key={s.label} className="rounded-card border-line shadow-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-display text-xl font-bold tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['today', 'Today'],
              ['tomorrow', 'Tomorrow'],
              ['all', 'All dates'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDay(id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                day === id
                  ? 'bg-brand text-brand-foreground'
                  : 'border border-line text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 hidden h-6 w-px bg-line sm:inline-block" />
          {(
            [
              ['booked', 'Booked'],
              ['seated', 'Seated'],
              ['done', 'Closed'],
              ['all', 'All'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatus(id)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                status === id
                  ? 'bg-foreground text-background'
                  : 'border border-line text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guest or phone…"
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={CalendarDays}
            title="No reservations"
            description="Book a table for walk-ins ahead of the rush, or clear filters."
            action={
              <Button className="rounded-full font-semibold" disabled={readOnly} onClick={openAdd}>
                <Plus className="mr-1.5 h-4 w-4" /> New reservation
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const table = r.tableId ? tables.find((t) => t.id === r.tableId) : undefined
            const active = r.status === 'pending' || r.status === 'confirmed'
            return (
              <Card key={r.id} className="rounded-card border-line shadow-card">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-muted">
                      <span className="text-xs font-semibold tabular-nums leading-none">
                        {r.time}
                      </span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground">
                        {r.durationMinutes}m
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-display text-base font-bold">{r.guestName}</h3>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            statusStyle[r.status],
                          )}
                        >
                          {statusLabel[r.status]}
                        </span>
                        {r.occasion && (
                          <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[11px] font-medium">
                            {r.occasion}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {r.partySize} guests
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Phone className="h-3.5 w-3.5" /> {r.phone}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5" />
                          {table ? `${table.name} · ${table.zone}` : 'No table yet'}
                        </span>
                        {r.date !== RESERVATION_TODAY && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" /> {r.date}
                          </span>
                        )}
                      </div>
                      {r.note && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{r.note}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {active && (
                      <>
                        {r.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={readOnly}
                            onClick={() => confirm(r)}
                          >
                            Confirm
                          </Button>
                        )}
                        <Button size="sm" disabled={readOnly} onClick={() => seat(r)}>
                          Seat
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={readOnly}
                          onClick={() => setStatusOf(r.id, 'no-show')}
                        >
                          No-show
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={readOnly}
                          className="text-danger hover:text-danger"
                          onClick={() => setStatusOf(r.id, 'cancelled')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Sheet open={drawer.open} onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[440px]">
          <SheetHeader>
            <SheetTitle>
              {drawer.reservation ? `Edit ${drawer.reservation.guestName}` : 'New reservation'}
            </SheetTitle>
            <SheetDescription>
              Hold a table for a party — assign now or confirm later.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="guest">Guest name</Label>
                <Input
                  id="guest"
                  value={form.guestName}
                  onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                  placeholder="Neha Kapoor"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98XXX XXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="party">Party size</Label>
                <Input
                  id="party"
                  type="number"
                  min={1}
                  max={20}
                  value={form.partySize}
                  onChange={(e) => setForm((f) => ({ ...f, partySize: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={30}
                  step={15}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Select
                  value={form.time}
                  onValueChange={(v) => setForm((f) => ({ ...f, time: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Table</Label>
                <Select
                  value={form.tableId}
                  onValueChange={(v) => setForm((f) => ({ ...f, tableId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign later" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Assign later</SelectItem>
                    {assignableTables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} · {t.seats} seats · {t.zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="occasion">Occasion (optional)</Label>
                <Input
                  id="occasion"
                  value={form.occasion}
                  onChange={(e) => setForm((f) => ({ ...f, occasion: e.target.value }))}
                  placeholder="Birthday, anniversary…"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Allergies, window seat, cake timing…"
                  rows={3}
                />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawer({ open: false, reservation: null })}>
              Cancel
            </Button>
            <Button disabled={readOnly} onClick={save}>
              {drawer.reservation ? 'Save changes' : 'Book table'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
