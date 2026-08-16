import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { useInventory } from '@/hooks/use-inventory'
import { inr } from '@/lib/currency'
import {
  lineTotal,
  purchaseGst,
  purchaseSubtotal,
  purchaseTotal,
  suppliers,
  type PurchaseEntry,
  type PurchaseLine,
} from '@/lib/mock'
import { cn } from '@/lib/utils'

type LineDraft = {
  qty: string
  unitCost: string
}

export interface PurchaseEntrySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Prefill a single ingredient (from row ⋮ → Add purchase). */
  presetIngredientId?: string | null
  readOnly?: boolean
  onSave: (entry: Omit<PurchaseEntry, 'id' | 'createdAt'>) => void
}

/** Sheet to record a supplier purchase — check master items, then set qty/cost. */
export function PurchaseEntrySheet({
  open,
  onOpenChange,
  presetIngredientId,
  readOnly,
  onSave,
}: PurchaseEntrySheetProps) {
  const { ingredients } = useInventory()
  const [supplier, setSupplier] = useState<string>(suppliers[0]?.name ?? '')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [date, setDate] = useState('2026-08-07')
  const [gstPct, setGstPct] = useState('5')
  const [note, setNote] = useState('')
  const [masterQuery, setMasterQuery] = useState('')
  /** Checked master ingredient ids. */
  const [checked, setChecked] = useState<Set<string>>(new Set())
  /** Qty / cost drafts keyed by ingredient id. */
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({})

  useEffect(() => {
    if (!open) return
    setInvoiceNo('')
    setDate('2026-08-07')
    setGstPct('5')
    setNote('')
    setMasterQuery('')

    const preset = presetIngredientId
      ? ingredients.find((i) => i.id === presetIngredientId)
      : undefined

    if (preset) {
      setSupplier(preset.supplier)
      setChecked(new Set([preset.id]))
      setDrafts({
        [preset.id]: {
          qty: String(Math.max(preset.reorder, 1)),
          unitCost: String(preset.costPerUnit),
        },
      })
    } else {
      setSupplier(suppliers[0]?.name ?? '')
      setChecked(new Set())
      setDrafts({})
    }
  }, [open, presetIngredientId, ingredients])

  // Full master list — supplier matches first, then the rest.
  const masterList = useMemo(() => {
    const q = masterQuery.trim().toLowerCase()
    const matched = ingredients.filter((i) => i.supplier === supplier)
    const rest = ingredients.filter((i) => i.supplier !== supplier)
    const ordered = [...matched, ...rest]
    if (!q) return ordered
    return ordered.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.supplier.toLowerCase().includes(q),
    )
  }, [supplier, masterQuery, ingredients])

  const toggle = (id: string, on: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
    if (on) {
      setDrafts((prev) => {
        if (prev[id]) return prev
        const item = ingredients.find((i) => i.id === id)
        return {
          ...prev,
          [id]: {
            qty: String(Math.max(item?.reorder ?? 1, 1)),
            unitCost: String(item?.costPerUnit ?? 0),
          },
        }
      })
    }
  }

  const setDraft = (id: string, patch: Partial<LineDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { qty: prev[id]?.qty ?? '', unitCost: prev[id]?.unitCost ?? '', ...patch },
    }))
  }

  const checkedItems = ingredients.filter((i) => checked.has(i.id))

  const parsedLines: PurchaseLine[] = checkedItems
    .map((item) => ({
      ingredientId: item.id,
      qty: Number(drafts[item.id]?.qty),
      unitCost: Number(drafts[item.id]?.unitCost),
    }))
    .filter((l) => l.qty > 0 && l.unitCost >= 0)

  const totals = { lines: parsedLines, gstPct: Number(gstPct) || 0 }
  const subtotal = purchaseSubtotal(totals)
  const gst = purchaseGst(totals)
  const total = purchaseTotal(totals)

  const submit = () => {
    if (!invoiceNo.trim()) {
      toast.error('Invoice number is required')
      return
    }
    if (checked.size === 0) {
      toast.error('Check at least one item from the master list')
      return
    }
    if (parsedLines.length === 0) {
      toast.error('Enter quantity for the checked items')
      return
    }
    onSave({
      supplier,
      invoiceNo: invoiceNo.trim(),
      date,
      lines: parsedLines,
      gstPct: Number(gstPct) || 0,
      note: note.trim() || undefined,
    })
    onOpenChange(false)
  }

  const canSave = Boolean(invoiceNo.trim()) && parsedLines.length > 0 && !readOnly

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>Purchase entry</SheetTitle>
          <SheetDescription>
            Check items from the master list, set qty and cost, then save to raise stock.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label>Supplier</Label>
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label htmlFor="invoice">Invoice #</Label>
              <Input
                id="invoice"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="AMUL-4522"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pur-date">Date</Label>
              <Input
                id="pur-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst">GST %</Label>
              <Select value={gstPct} onValueChange={setGstPct}>
                <SelectTrigger id="gst">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% — no GST</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Master checklist — always shown so unchecked state still gives the list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Master list</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {checked.size} selected
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={masterQuery}
                onChange={(e) => setMasterQuery(e.target.value)}
                placeholder="Search master ingredients…"
                className="pl-9"
              />
            </div>

            {ingredients.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-foreground">
                Master list is empty — add ingredients under Inventory → Master first.
              </p>
            ) : (
              <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-line p-1">
                {masterList.length === 0 ? (
                  <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No master items match “{masterQuery}”.
                  </li>
                ) : (
                  masterList.map((item) => {
                    const isOn = checked.has(item.id)
                    const supplierMatch = item.supplier === supplier
                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                            isOn ? 'bg-brand/15' : 'hover:bg-surface-muted/70',
                          )}
                        >
                          <Checkbox
                            checked={isOn}
                            disabled={readOnly}
                            onCheckedChange={(v) => toggle(item.id, v === true)}
                            aria-label={`Select ${item.name}`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">{item.name}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {item.unit} · on hand {item.stock}
                              {!supplierMatch && ` · ${item.supplier}`}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {inr(item.costPerUnit)}
                          </span>
                        </label>
                      </li>
                    )
                  })
                )}
              </ul>
            )}

            {checked.size === 0 && ingredients.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Nothing checked yet — tick items from the master list above to add them to this
                purchase.
              </p>
            )}
          </div>

          {/* Qty / cost only for checked master items */}
          {checkedItems.length > 0 && (
            <div className="space-y-3">
              <Label>Quantities</Label>
              {checkedItems.map((item) => {
                const draft = drafts[item.id] ?? { qty: '', unitCost: '' }
                const qty = Number(draft.qty) || 0
                const cost = Number(draft.unitCost) || 0
                const rowTotal = lineTotal({
                  ingredientId: item.id,
                  qty,
                  unitCost: cost,
                })
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-line bg-surface-muted/30 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {item.name}{' '}
                        <span className="font-normal text-muted-foreground">({item.unit})</span>
                      </p>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-danger"
                        onClick={() => toggle(item.id, false)}
                      >
                        Uncheck
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          value={draft.qty}
                          onChange={(e) => setDraft(item.id, { qty: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Unit cost ₹</Label>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={draft.unitCost}
                          onChange={(e) => setDraft(item.id, { unitCost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <div
                          className={cn(
                            'flex h-10 items-center rounded-md border border-line bg-surface px-3 text-sm tabular-nums',
                            rowTotal > 0 ? 'font-medium' : 'text-muted-foreground',
                          )}
                        >
                          {rowTotal > 0 ? inr(rowTotal) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pur-note">Note (optional)</Label>
            <Textarea
              id="pur-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Delivery charge, credit note…"
              rows={2}
            />
          </div>

          <div className="space-y-1.5 rounded-xl border border-line bg-surface-muted/40 px-4 py-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{inr(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST ({Number(gstPct) || 0}%)</span>
              <span className="tabular-nums">{inr(gst)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
              <span>Invoice total</span>
              <span className="tabular-nums">{inr(total)}</span>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={submit}>
            Save purchase
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
