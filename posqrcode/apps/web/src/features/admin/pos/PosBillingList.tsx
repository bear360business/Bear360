import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Plus,
  Printer,
  Receipt,
  Search,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { QuantityStepper } from '@/components/app/QuantityStepper'
import { useOrders } from '@/hooks/use-orders'
import { useTables } from '@/hooks/use-tables'
import { useMenu } from '@/hooks/use-menu'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import { inr } from '@/lib/currency'
import type { Order, OrderItem, OrderStatus, OrderType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PosBillingListProps {
  onNewBill: () => void
}

export function PosBillingList({ onNewBill }: PosBillingListProps) {
  const { orders, updateOrder, deleteOrder } = useOrders()
  const { tables } = useTables()
  const { items: menuItems } = useMenu()
  const restaurant = useCurrentVenue()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all')
  const [channelFilter, setChannelFilter] = useState<'all' | 'pos' | 'qr'>('all')

  // Modals state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null)
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Edit form state
  const [editItems, setEditItems] = useState<OrderItem[]>([])
  const [editType, setEditType] = useState<OrderType>('dine-in')
  const [editTableId, setEditTableId] = useState<string>('')
  const [editGuestName, setEditGuestName] = useState('')
  const [editGuestPhone, setEditGuestPhone] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash')
  const [editPaid, setEditPaid] = useState(true)
  const [editStatus, setEditStatus] = useState<OrderStatus>('completed')
  const [editNote, setEditNote] = useState('')
  const [selectedAddDishId, setSelectedAddDishId] = useState('')

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Channel filter
        if (channelFilter === 'pos' && o.channel !== 'pos' && o.origin !== 'pos') return false
        if (channelFilter === 'qr' && o.channel === 'pos') return false

        // Status filter
        if (statusFilter === 'paid' && !o.paid && o.status !== 'completed') return false
        if (statusFilter === 'pending' && (o.paid || o.status === 'completed' || o.status === 'cancelled')) return false
        if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false

        // Search query
        if (!search.trim()) return true
        const q = search.toLowerCase().trim()
        const billNum = String(o.number).toLowerCase()
        const token = (o.token || '').toLowerCase()
        const table = (o.tableName || '').toLowerCase()
        const guest = (o.customerName || '').toLowerCase()
        const phone = (o.customerPhone || '').toLowerCase()
        const items = o.items.map((i) => i.name.toLowerCase()).join(' ')
        return (
          billNum.includes(q) ||
          token.includes(q) ||
          table.includes(q) ||
          guest.includes(q) ||
          phone.includes(q) ||
          items.includes(q)
        )
      })
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())
  }, [orders, channelFilter, statusFilter, search])

  // Aggregate statistics
  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const todayOrders = orders.filter((o) => new Date(o.placedAt).toDateString() === today)
    const todayRevenue = todayOrders
      .filter((o) => o.paid || o.status === 'completed')
      .reduce((sum, o) => sum + o.total, 0)
    const paidCount = orders.filter((o) => o.paid || o.status === 'completed').length
    const pendingCount = orders.filter((o) => !o.paid && o.status !== 'completed' && o.status !== 'cancelled').length

    return {
      todayRevenue,
      totalCount: orders.length,
      paidCount,
      pendingCount,
    }
  }, [orders])

  // Open Edit Modal
  const openEdit = (order: Order) => {
    setEditingOrder(order)
    setEditItems([...order.items])
    setEditType(order.orderType || 'dine-in')
    setEditTableId(order.tableId || '')
    setEditGuestName(order.customerName || '')
    setEditGuestPhone(order.customerPhone || '')
    const pm = (order.paymentMethod || '').toLowerCase()
    setEditPaymentMethod(pm === 'upi' ? 'upi' : pm === 'card' ? 'card' : 'cash')
    setEditPaid(order.paid ?? false)
    setEditStatus(order.status)
    setEditNote(order.note || '')
    setSelectedAddDishId('')
  }

  // Calculate totals in edit modal
  const editSubtotal = useMemo(() => {
    return editItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  }, [editItems])

  const editTax = useMemo(() => {
    const taxRate = Number(restaurant.gstRatePct ?? 5) / 100
    return Math.round(editSubtotal * taxRate * 100) / 100
  }, [editSubtotal, restaurant.gstRatePct])

  const editTotal = useMemo(() => {
    return Math.round((editSubtotal + editTax) * 100) / 100
  }, [editSubtotal, editTax])

  // Save Edit Changes
  const handleSaveEdit = async () => {
    if (!editingOrder) return
    if (editItems.length === 0) {
      toast.error('Bill must have at least 1 item')
      return
    }

    setIsSavingEdit(true)
    try {
      const selectedTable = tables.find((t) => t.id === editTableId)
      await updateOrder(editingOrder.id, {
        items: editItems,
        orderType: editType,
        tableId: editType === 'dine-in' ? editTableId : undefined,
        tableName:
          editType === 'dine-in'
            ? selectedTable?.name ?? (editTableId ? `Table ${editTableId}` : 'Dine-in')
            : editType === 'delivery'
              ? 'Delivery'
              : 'Takeaway',
        customerName: editGuestName.trim() || undefined,
        customerPhone: editGuestPhone.trim() || undefined,
        paymentMethod: editPaymentMethod,
        paid: editPaid,
        status: editStatus,
        note: editNote.trim() || undefined,
      })
      toast.success(`Bill #${editingOrder.number} updated successfully`)
      setEditingOrder(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update bill')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingOrder) return
    setIsDeleting(true)
    try {
      await deleteOrder(deletingOrder.id)
      toast.success(`Bill #${deletingOrder.number} deleted`)
      setDeletingOrder(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete bill')
    } finally {
      setIsDeleting(false)
    }
  }

  // Add Item to Edit List
  const handleAddDishToEdit = (dishId: string) => {
    if (!dishId) return
    const dish = menuItems.find((m) => m.id === dishId)
    if (!dish) return

    setEditItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === dish.id)
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === dish.id ? { ...i, qty: i.qty + 1 } : i,
        )
      }
      return [
        ...prev,
        {
          menuItemId: dish.id,
          name: dish.name,
          price: dish.price,
          qty: 1,
        },
      ]
    })
    setSelectedAddDishId('')
    toast.success(`Added ${dish.name} to bill`)
  }

  return (
    <div className="space-y-5">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-card border border-line bg-surface p-3.5 shadow-card sm:p-4">
          <p className="text-xs font-medium text-muted-foreground">Today's Revenue</p>
          <p className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
            {inr(stats.todayRevenue)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Paid bills today</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-3.5 shadow-card sm:p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Bills</p>
          <p className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
            {stats.totalCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">All time records</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-3.5 shadow-card sm:p-4">
          <p className="text-xs font-medium text-muted-foreground">Settled / Paid</p>
          <p className="mt-1 font-display text-xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-2xl">
            {stats.paidCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Completed payments</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-3.5 shadow-card sm:p-4">
          <p className="text-xs font-medium text-muted-foreground">Pending / KOT</p>
          <p className="mt-1 font-display text-xl font-bold text-amber-600 dark:text-amber-400 sm:text-2xl">
            {stats.pendingCount}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Awaiting payment</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by bill #, table, customer or dish…"
            className="h-10 pl-9 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Pills */}
          <div className="flex items-center rounded-xl border border-line bg-surface-muted/30 p-1">
            {(
              [
                ['all', 'All'],
                ['paid', 'Paid'],
                ['pending', 'Pending'],
                ['cancelled', 'Cancelled'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  statusFilter === key
                    ? 'bg-brand font-semibold text-brand-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Channel dropdown */}
          <Select
            value={channelFilter}
            onValueChange={(v) => setChannelFilter(v as 'all' | 'pos' | 'qr')}
          >
            <SelectTrigger className="h-9 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="pos">POS Counter</SelectItem>
              <SelectItem value="qr">QR Orders</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            onClick={onNewBill}
            className="h-9 rounded-xl bg-brand text-xs font-semibold text-brand-foreground hover:opacity-90"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            New Bill
          </Button>
        </div>
      </div>

      {/* Bills Content: Table on Desktop, Cards on Mobile */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-card border border-line bg-surface py-16 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground">
            <Receipt className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold">No bills found</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {search || statusFilter !== 'all' || channelFilter !== 'all'
              ? 'No bills match your current filters. Try resetting search or filters.'
              : 'No orders have been placed yet. Start a new counter billing ticket!'}
          </p>
          <Button
            type="button"
            onClick={onNewBill}
            className="mt-5 rounded-full px-6"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create First Bill
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Hidden on mobile/tablet screens) */}
          <div className="hidden rounded-card border border-line bg-surface shadow-card lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3.5 font-semibold">Bill #</th>
                    <th className="px-3 py-3.5 font-semibold">Time</th>
                    <th className="px-3 py-3.5 font-semibold">Type & Table</th>
                    <th className="px-3 py-3.5 font-semibold">Items</th>
                    <th className="px-3 py-3.5 font-semibold">Payment</th>
                    <th className="px-3 py-3.5 font-semibold">Total</th>
                    <th className="px-3 py-3.5 font-semibold">Status</th>
                    <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredOrders.map((order) => {
                    const isPaid = order.paid || order.status === 'completed'
                    const isCancelled = order.status === 'cancelled'
                    const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0)
                    const placedTime = new Date(order.placedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <tr key={order.id} className="hover:bg-surface-muted/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-bold text-foreground">
                            #{order.number}
                          </span>
                          {order.token && order.token !== String(order.number) && (
                            <span className="block text-[11px] text-muted-foreground">
                              {order.token}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                          {placedTime}
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium">
                            {order.tableName || order.orderType}
                          </span>
                          {order.customerName && (
                            <span className="block text-[11px] text-muted-foreground truncate max-w-[130px]">
                              {order.customerName}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="max-w-[200px] truncate text-xs text-foreground">
                            {order.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {itemCount} item{itemCount === 1 ? '' : 's'}
                          </span>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs capitalize text-muted-foreground">
                            {(order.paymentMethod || '').toLowerCase() === 'upi' ? (
                              <Smartphone className="h-3 w-3 text-purple-500" />
                            ) : (order.paymentMethod || '').toLowerCase() === 'card' ? (
                              <CreditCard className="h-3 w-3 text-blue-500" />
                            ) : (
                              <Banknote className="h-3 w-3 text-emerald-500" />
                            )}
                            {order.paymentMethod || 'Cash'}
                          </span>
                        </td>

                        <td className="px-3 py-3.5 font-semibold text-foreground whitespace-nowrap">
                          {inr(order.total)}
                        </td>

                        <td className="px-3 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : isCancelled
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                            )}
                          >
                            {isPaid ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : isCancelled ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {isPaid ? 'Paid' : isCancelled ? 'Void' : 'Pending'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Edit bill"
                              onClick={() => openEdit(order)}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Print receipt"
                              onClick={() => setPrintingOrder(order)}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                              title="Delete bill"
                              onClick={() => setDeletingOrder(order)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Responsive Cards View (Shown on screens < lg) */}
          <div className="space-y-3 lg:hidden">
            {filteredOrders.map((order) => {
              const isPaid = order.paid || order.status === 'completed'
              const isCancelled = order.status === 'cancelled'
              const placedTime = new Date(order.placedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={order.id}
                  className="rounded-card border border-line bg-surface p-4 shadow-card space-y-3"
                >
                  {/* Card Header: Bill #, Status, and Total */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        #{order.number}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : isCancelled
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                        )}
                      >
                        {isPaid ? 'Paid' : isCancelled ? 'Void' : 'Pending'}
                      </span>
                    </div>

                    <span className="font-display text-base font-bold text-foreground">
                      {inr(order.total)}
                    </span>
                  </div>

                  {/* Card Details: Type/Table, Time, Items */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {order.tableName || order.orderType}
                      </span>
                      <span>{placedTime}</span>
                    </div>

                    <div className="rounded-lg bg-surface-muted/50 p-2 text-xs text-foreground/90">
                      {order.items.map((i) => (
                        <div key={i.menuItemId + i.name} className="flex justify-between py-0.5">
                          <span>
                            {i.name} × {i.qty}
                          </span>
                          <span className="font-medium">{inr(i.price * i.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer: Payment method & Action buttons */}
                  <div className="flex items-center justify-between border-t border-line/60 pt-2.5">
                    <span className="inline-flex items-center gap-1 text-xs capitalize text-muted-foreground">
                      {(order.paymentMethod || '').toLowerCase() === 'upi' ? (
                        <Smartphone className="h-3 w-3 text-purple-500" />
                      ) : (order.paymentMethod || '').toLowerCase() === 'card' ? (
                        <CreditCard className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Banknote className="h-3 w-3 text-emerald-500" />
                      )}
                      {order.paymentMethod || 'Cash'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-2.5 text-xs"
                        onClick={() => openEdit(order)}
                      >
                        <Edit3 className="mr-1 h-3 w-3" />
                        Edit
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg px-2.5 text-xs"
                        onClick={() => setPrintingOrder(order)}
                      >
                        <Printer className="mr-1 h-3 w-3" />
                        Print
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                        onClick={() => setDeletingOrder(order)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ================= EDIT BILL SHEET ================= */}
      <Sheet open={Boolean(editingOrder)} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Bill #{editingOrder?.number}</SheetTitle>
            <SheetDescription>
              Modify items, table, payment method, or settlement status for this bill.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 text-left">
            {/* Order Type & Table */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Order Type</Label>
                <Select
                  value={editType}
                  onValueChange={(v) => setEditType(v as OrderType)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dine-in">Dine-in</SelectItem>
                    <SelectItem value="takeaway">Takeaway</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editType === 'dine-in' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Table</Label>
                  <Select value={editTableId} onValueChange={setEditTableId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.seats} seats)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Name</Label>
                <Input
                  value={editGuestName}
                  onChange={(e) => setEditGuestName(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Customer Phone</Label>
                <Input
                  value={editGuestPhone}
                  onChange={(e) => setEditGuestPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Bill Line Items */}
            <div className="rounded-xl border border-line p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Items in Bill</p>
                <span className="text-[11px] text-muted-foreground">
                  {editItems.length} item{editItems.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="divide-y divide-line/60">
                {editItems.map((item, idx) => (
                  <div key={item.menuItemId + idx} className="flex items-center justify-between py-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">{inr(item.price)} each</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <QuantityStepper
                        value={item.qty}
                        onChange={(qty) => {
                          if (qty <= 0) {
                            setEditItems((prev) => prev.filter((_, i) => i !== idx))
                          } else {
                            setEditItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, qty } : it)),
                            )
                          }
                        }}
                      />

                      <span className="w-14 text-right text-xs font-semibold">
                        {inr(item.price * item.qty)}
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                        onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add dish dropdown */}
              <div className="pt-2 border-t border-line/60 flex gap-2">
                <Select value={selectedAddDishId} onValueChange={handleAddDishToEdit}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="+ Add dish to this bill..." />
                  </SelectTrigger>
                  <SelectContent>
                    {menuItems
                      .filter((m) => m.available)
                      .map((dish) => (
                        <SelectItem key={dish.id} value={dish.id}>
                          {dish.name} · {inr(dish.price)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method</Label>
                <Select
                  value={editPaymentMethod}
                  onValueChange={(v) => setEditPaymentMethod(v as 'cash' | 'upi' | 'card')}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Settlement Status</Label>
                <Select
                  value={editPaid ? 'paid' : 'unpaid'}
                  onValueChange={(v) => {
                    const isP = v === 'paid'
                    setEditPaid(isP)
                    setEditStatus(isP ? 'completed' : 'pending')
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid (Settled)</SelectItem>
                    <SelectItem value="unpaid">Unpaid (Pending)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="rounded-xl border border-line bg-surface-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{inr(editSubtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST ({restaurant.gstRatePct ?? 5}%)</span>
                <span>{inr(editTax)}</span>
              </div>
              <div className="flex justify-between border-t border-line/60 pt-1.5 text-sm font-bold text-foreground">
                <span>Updated Total</span>
                <span>{inr(editTotal)}</span>
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6 flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingOrder(null)}
              disabled={isSavingEdit}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || editItems.length === 0}
              className="flex-1 sm:flex-initial bg-brand font-semibold text-brand-foreground"
            >
              {isSavingEdit ? 'Saving…' : 'Save Changes'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ================= DELETE CONFIRMATION DIALOG ================= */}
      <Dialog
        open={Boolean(deletingOrder)}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Bill #{deletingOrder?.number}?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete this bill record and remove it from sales history. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deletingOrder && (
            <div className="rounded-xl border border-line bg-surface-muted/40 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Table / Type:</span>
                <span className="font-medium">{deletingOrder.tableName || deletingOrder.orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold text-foreground">{inr(deletingOrder.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span>{deletingOrder.items.length} items</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingOrder(null)}
              disabled={isDeleting}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 sm:flex-initial"
            >
              {isDeleting ? 'Deleting…' : 'Delete Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= PRINT RECEIPT DIALOG ================= */}
      <Dialog
        open={Boolean(printingOrder)}
        onOpenChange={(open) => !open && setPrintingOrder(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Receipt Preview</DialogTitle>
          </DialogHeader>

          {printingOrder && (
            <div
              id="thermal-receipt"
              className="rounded-xl border border-line bg-white p-5 text-black font-mono text-xs space-y-3 shadow-sm"
            >
              {/* Receipt Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-zinc-300 pb-3">
                <p className="font-bold text-sm uppercase tracking-wider">{restaurant.name}</p>
                {restaurant.address && <p className="text-[11px] text-zinc-600">{restaurant.address}</p>}
                {restaurant.phone && <p className="text-[11px] text-zinc-600">Ph: {restaurant.phone}</p>}
                {restaurant.gstin && <p className="text-[11px] text-zinc-600">GSTIN: {restaurant.gstin}</p>}
              </div>

              {/* Receipt Meta */}
              <div className="flex justify-between text-[11px] text-zinc-700">
                <div>
                  <p>Bill: #{printingOrder.number}</p>
                  <p>Type: {printingOrder.tableName || printingOrder.orderType}</p>
                </div>
                <div className="text-right">
                  <p>{new Date(printingOrder.placedAt).toLocaleDateString()}</p>
                  <p>{new Date(printingOrder.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-zinc-300 py-2 space-y-1.5">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>Item</span>
                  <span>Qty × Price</span>
                  <span>Total</span>
                </div>
                {printingOrder.items.map((item) => (
                  <div key={item.menuItemId + item.name} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[140px]">{item.name}</span>
                    <span>{item.qty} × {inr(item.price)}</span>
                    <span className="font-semibold">{inr(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] text-zinc-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{inr(printingOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST ({((restaurant.gstRatePct ?? 5) / 2).toFixed(1)}%):</span>
                  <span>{inr(printingOrder.cgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST ({((restaurant.gstRatePct ?? 5) / 2).toFixed(1)}%):</span>
                  <span>{inr(printingOrder.sgst)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-400 pt-1 font-bold text-xs text-black">
                  <span>GRAND TOTAL:</span>
                  <span>{inr(printingOrder.total)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                  <span>Payment: {printingOrder.paymentMethod?.toUpperCase() || 'CASH'}</span>
                  <span>{printingOrder.paid ? 'PAID' : 'UNPAID'}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center text-[10px] text-zinc-500 border-t border-dashed border-zinc-300 pt-2">
                <p>Thank you for your visit!</p>
                <p className="text-[9px]">Powered by Bear360</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPrintingOrder(null)}
              className="flex-1 sm:flex-initial"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.print()
              }}
              className="flex-1 sm:flex-initial bg-brand font-semibold text-brand-foreground"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
