import { Link } from 'react-router-dom'
import { MoreVertical, QrCode } from 'lucide-react'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useOrders } from '@/hooks/use-orders'
import { useTables } from '@/hooks/use-tables'
import { inr } from '@/lib/currency'
import { getElapsedMinutes } from '@/lib/mock'
import type { DiningTable } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface TableCardProps {
  table: DiningTable
  onQr: (table: DiningTable) => void
  onAction: (action: 'edit' | 'free' | 'delete' | 'seat', table: DiningTable) => void
}

/** Admin table card — order strip reads the live order store. */
export function TableCard({ table, onQr, onAction }: TableCardProps) {
  const { getById } = useOrders()
  const { reservations } = useTables()
  const occupied = table.status === 'occupied'
  const reserved = table.status === 'reserved'
  const order = table.activeOrderId ? getById(table.activeOrderId) : undefined
  const reservation = table.reservationId
    ? reservations.find((r) => r.id === table.reservationId)
    : undefined

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-card border border-line p-4 shadow-card',
        occupied && 'bg-warning-tint/50',
        reserved && 'bg-info-tint/40',
        !occupied && !reserved && 'bg-surface',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-foreground">{table.name}</h3>
        <StatusBadge status={table.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        {table.seats} seats · {table.zone}
      </p>

      {occupied && order && (
        <Link
          to="/orders"
          className="flex items-center justify-between rounded-[10px] bg-surface-muted/70 px-3 py-2 text-xs transition-colors hover:bg-surface-muted"
        >
          <span className="font-semibold text-foreground">#{order.number}</span>
          <span className="text-muted-foreground">
            {inr(order.total)} · {getElapsedMinutes(order)}m
          </span>
        </Link>
      )}

      {occupied && !order && (
        <p className="rounded-[10px] bg-surface-muted/70 px-3 py-2 text-xs text-muted-foreground">
          Seated — open POS to take the order
        </p>
      )}

      {reserved && reservation && (
        <Link
          to="/tables/reservations"
          className="flex items-center justify-between rounded-[10px] bg-surface-muted/70 px-3 py-2 text-xs transition-colors hover:bg-surface-muted"
        >
          <span className="truncate font-semibold text-foreground">{reservation.guestName}</span>
          <span className="shrink-0 text-muted-foreground">
            {reservation.time} · {reservation.partySize}p
          </span>
        </Link>
      )}

      <div className="mt-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-full"
          onClick={() => onQr(table)}
        >
          <QrCode className="h-4 w-4" /> QR
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Table actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onAction('edit', table)}>Edit table</DropdownMenuItem>
            {reserved && (
              <DropdownMenuItem onSelect={() => onAction('seat', table)}>
                Seat guests
              </DropdownMenuItem>
            )}
            {(occupied || reserved) && (
              <DropdownMenuItem onSelect={() => onAction('free', table)}>
                Mark free
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger focus:text-danger"
              onSelect={() => onAction('delete', table)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
