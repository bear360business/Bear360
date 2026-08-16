import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Download, LayoutGrid, Plus, Printer } from 'lucide-react'
import { brandLogoUrl } from '@/components/app/BrandLogo'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { TableCard } from '@/components/app/TableCard'
import { UsageMeter } from '@/components/app/UsageMeter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { usePageState } from '@/hooks/use-page-state'
import { useServiceConfig } from '@/hooks/use-service-config'
import { useIndustryCopy } from '@/hooks/use-industry-copy'
import { useTables } from '@/hooks/use-tables'
import { useTenant } from '@/hooks/use-tenant'
import {
  currentRestaurantId,
  getCounterQrUrl,
  getTableQrUrl,
  tableZones,
} from '@/lib/mock'
import { downloadQrSvgAsPng } from '@/lib/qr-download'
import { ORDER_TYPE_META, tableFreeOrderTypes } from '@/lib/service-config'
import type { DiningTable, TableStatus, TableZone } from '@/lib/types'
import { cn } from '@/lib/utils'

type Filter = 'all' | TableStatus

/** Floor map — CRUD, zones, QR, seat limit (doc §6.9 + SAAS zones). */
export function TablesPage() {
  const state = usePageState()
  const navigate = useNavigate()
  const { readOnly, limit } = useTenant()
  const { config: service, enabledOrderTypes } = useServiceConfig()
  const { tables: floor, upsertTable, removeTable, markFree, seatReservation } = useTables()
  const copy = useIndustryCopy()
  const [filter, setFilter] = useState<Filter>('all')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [qrTable, setQrTable] = useState<DiningTable | null>(null)
  const [counterQrOpen, setCounterQrOpen] = useState(false)
  const tableQrSvgRef = useRef<HTMLDivElement>(null)
  const counterQrSvgRef = useRef<HTMLDivElement>(null)
  const counterUrl = getCounterQrUrl(currentRestaurantId)
  const counterTypes = tableFreeOrderTypes(enabledOrderTypes)
  const showCounterBanner =
    service.counterOrdering && counterTypes.length > 0
  const [drawer, setDrawer] = useState<{ open: boolean; table: DiningTable | null }>({
    open: false,
    table: null,
  })
  const [form, setForm] = useState({ name: '', seats: '4', zone: 'Main hall' as TableZone })

  const seatsLimit = limit('tables')
  const atLimit = seatsLimit.max !== null && floor.length >= seatsLimit.max

  const counts = useMemo(
    () => ({
      all: floor.length,
      free: floor.filter((t) => t.status === 'free').length,
      occupied: floor.filter((t) => t.status === 'occupied').length,
      reserved: floor.filter((t) => t.status === 'reserved').length,
    }),
    [floor],
  )

  const filtered = useMemo(
    () =>
      floor.filter(
        (t) =>
          (filter === 'all' || t.status === filter) &&
          (zoneFilter === 'all' || t.zone === zoneFilter),
      ),
    [floor, filter, zoneFilter],
  )

  const segments: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'free', label: 'Free', count: counts.free },
    { id: 'occupied', label: 'Occupied', count: counts.occupied },
    { id: 'reserved', label: 'Reserved', count: counts.reserved },
  ]

  const qrUrl = qrTable ? getTableQrUrl(currentRestaurantId, qrTable.id) : ''

  const openAdd = () => {
    if (atLimit) {
      toast('Table limit reached', {
        description: `Your plan allows ${seatsLimit.max} tables. Upgrade for unlimited.`,
        action: { label: 'Billing', onClick: () => navigate('/billing') },
      })
      return
    }
    const nextNum = Math.max(0, ...floor.map((t) => t.number)) + 1
    setForm({
      name: `T-${String(nextNum).padStart(2, '0')}`,
      seats: '4',
      zone: 'Main hall',
    })
    setDrawer({ open: true, table: null })
  }

  const openEdit = (table: DiningTable) => {
    setForm({ name: table.name, seats: String(table.seats), zone: table.zone })
    setDrawer({ open: true, table })
  }

  const save = () => {
    const seats = Math.max(1, Number(form.seats) || 1)
    const name = form.name.trim() || 'Table'
    if (drawer.table) {
      upsertTable({ ...drawer.table, name, seats, zone: form.zone })
      toast.success(`${name} updated`)
    } else {
      const number = Math.max(0, ...floor.map((t) => t.number)) + 1
      const next: DiningTable = {
        id: `t-${String(number).padStart(2, '0')}`,
        name,
        number,
        seats,
        zone: form.zone,
        status: 'free',
      }
      upsertTable(next)
      toast.success(`${name} added — QR ready`)
    }
    setDrawer({ open: false, table: null })
  }

  const onAction = (action: 'edit' | 'free' | 'delete' | 'seat', table: DiningTable) => {
    if (readOnly && action !== 'edit') {
      toast.error('Account is read-only')
      return
    }
    if (action === 'edit') {
      openEdit(table)
      return
    }
    if (action === 'free') {
      markFree(table.id)
      toast.success(`${table.name} marked free`)
      return
    }
    if (action === 'seat') {
      if (table.reservationId) seatReservation(table.reservationId)
      else upsertTable({ ...table, status: 'occupied', reservationId: undefined })
      toast.success(`${table.name} seated — open POS to take the order`)
      return
    }
    if (action === 'delete') {
      if (table.status === 'occupied') {
        toast.error('Free the table before deleting')
        return
      }
      removeTable(table.id)
      toast.success(`${table.name} deleted`)
    }
  }

  return (
    <>
      <PageHeader
        title={copy.spaces}
        caption={`${counts.all} ${copy.spaces.toLowerCase()} · ${counts.occupied} occupied · ${counts.reserved} reserved · live floor`}
        actions={
          <Button className="rounded-full font-semibold" disabled={readOnly} onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add {copy.space.toLowerCase()}
          </Button>
        }
      />

      <Card className="mb-4 rounded-card border-line shadow-card">
        <CardContent className="p-4">
          <UsageMeter
            limitKey="tables"
            state={{ ...seatsLimit, used: floor.length }}
            action={
              atLimit ? (
                <Button size="sm" variant="outline" onClick={() => navigate('/billing')}>
                  Upgrade
                </Button>
              ) : undefined
            }
          />
        </CardContent>
      </Card>

      {showCounterBanner ? (
        <Card className="mb-4 rounded-card border-brand/30 bg-brand-tint/40 shadow-card">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Counter orders (no table)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Walk-in takeaway / delivery — separate from table dine-in below
                {counterTypes.length > 0
                  ? ` · ${counterTypes
                      .map((t) => ORDER_TYPE_META.find((m) => m.id === t)?.label ?? t)
                      .join(' · ')}`
                  : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setCounterQrOpen(true)}>
                Show QR
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={counterUrl} target="_blank" rel="noreferrer">
                  Open guest
                </a>
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" asChild>
                <Link to="/venue-setup">Ordering settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        (enabledOrderTypes.includes('takeaway') ||
          enabledOrderTypes.includes('delivery')) && (
          <Card className="mb-4 rounded-card border-line shadow-card">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Pickup / delivery is on, but Counter QR is off — enable it under Ordering &amp;
                checkout.
              </p>
              <Button size="sm" className="rounded-full" asChild>
                <Link to="/venue-setup">Open settings</Link>
              </Button>
            </CardContent>
          </Card>
        )
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-full border border-line bg-surface p-1 sm:w-fit">
          {segments.map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => setFilter(seg.id)}
              className={cn(
                'flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none',
                filter === seg.id
                  ? 'bg-brand font-semibold text-brand-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {seg.label} ({seg.count})
            </button>
          ))}
        </div>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All zones</SelectItem>
            {tableZones.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state === 'loading' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <LoadingSkeleton variant="card" count={8} />
        </div>
      )}

      {state === 'empty' && (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={LayoutGrid}
            title="No tables yet"
            description="Add your first table to generate its QR code."
            action={
              <Button className="rounded-full font-semibold" disabled={readOnly} onClick={openAdd}>
                <Plus className="mr-1.5 h-4 w-4" /> Add table
              </Button>
            }
          />
        </div>
      )}

      {(state === 'ready' || state === 'error') &&
        (filtered.length === 0 ? (
          <div className="rounded-card border border-line bg-surface shadow-card">
            <EmptyState
              icon={LayoutGrid}
              title="No tables match"
              description="Try a different status or zone filter."
              action={
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setFilter('all')
                    setZoneFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filtered.map((table) => (
              <TableCard key={table.id} table={table} onQr={setQrTable} onAction={onAction} />
            ))}
          </div>
        ))}

      <Sheet open={drawer.open} onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>{drawer.table ? `Edit ${drawer.table.name}` : 'Add table'}</SheetTitle>
            <SheetDescription>
              {drawer.table
                ? 'Rename, change seats or move to another zone.'
                : 'Each table gets its own QR for dine-in ordering.'}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="table-name">Name</Label>
              <Input
                id="table-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="T-13"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-seats">Seats</Label>
                <Input
                  id="table-seats"
                  type="number"
                  min={1}
                  max={20}
                  value={form.seats}
                  onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Zone</Label>
                <Select
                  value={form.zone}
                  onValueChange={(v) => setForm((f) => ({ ...f, zone: v as TableZone }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tableZones.map((z) => (
                      <SelectItem key={z} value={z}>
                        {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawer({ open: false, table: null })}>
              Cancel
            </Button>
            <Button disabled={readOnly} onClick={save}>
              {drawer.table ? 'Save changes' : 'Add table'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={qrTable !== null} onOpenChange={(open) => !open && setQrTable(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {qrTable?.name} · {qrTable?.zone}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div
              ref={tableQrSvgRef}
              className="rounded-2xl border-4 border-brand bg-white p-4"
            >
              {qrTable && (
                <QRCodeSVG
                  value={qrUrl}
                  size={208}
                  level="M"
                  imageSettings={{
                    src: brandLogoUrl,
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Table dine-in — guest can switch to takeaway at checkout
            </p>
            <p className="max-w-full truncate text-xs text-muted-foreground">
              {qrUrl.replace(/^https?:\/\//, '')}
            </p>
            <div className="flex w-full flex-wrap justify-center gap-2">
              <Button
                className="rounded-full font-semibold"
                onClick={() => {
                  const ok = downloadQrSvgAsPng(
                    tableQrSvgRef.current?.querySelector('svg'),
                    `${qrTable?.name ?? 'table'}-qr.png`,
                  )
                  if (ok) toast.success(`${qrTable?.name} QR downloaded`)
                  else toast.error('Could not download QR')
                }}
              >
                <Download className="h-4 w-4" /> Download PNG
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => toast.info('Sending to printer…')}
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  navigator.clipboard?.writeText(qrUrl)
                  toast.success('Link copied')
                }}
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={counterQrOpen} onOpenChange={setCounterQrOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Counter QR · no table</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div
              ref={counterQrSvgRef}
              className="rounded-2xl border-4 border-brand bg-white p-4"
            >
              <QRCodeSVG
                value={counterUrl}
                size={208}
                level="M"
                imageSettings={{
                  src: brandLogoUrl,
                  height: 36,
                  width: 36,
                  excavate: true,
                }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Stick this at the counter for takeaway / delivery — not for table seats.
            </p>
            <p className="max-w-full truncate text-xs text-muted-foreground">
              {counterUrl.replace(/^https?:\/\//, '')}
            </p>
            <div className="flex w-full flex-wrap justify-center gap-2">
              <Button
                className="rounded-full font-semibold"
                onClick={() => {
                  const ok = downloadQrSvgAsPng(
                    counterQrSvgRef.current?.querySelector('svg'),
                    'counter-qr.png',
                  )
                  if (ok) {
                    toast.success('Counter QR downloaded', {
                      description: 'Print and place it at the counter.',
                    })
                  } else toast.error('Could not download QR')
                }}
              >
                <Download className="h-4 w-4" /> Download PNG
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  navigator.clipboard?.writeText(counterUrl)
                  toast.success('Counter link copied')
                }}
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
