import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Plus, Search } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { PurchaseEntrySheet } from '@/features/admin/inventory/PurchaseEntrySheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInventory } from '@/hooks/use-inventory'
import { useTenant } from '@/hooks/use-tenant'
import { inr } from '@/lib/currency'
import {
  purchaseGst,
  purchaseSubtotal,
  purchaseTotal,
  suppliers,
  type PurchaseEntry,
} from '@/lib/mock'
import { cn } from '@/lib/utils'

/** A10 Purchases — invoice list + new entry sheet (doc §8.4). */
export function PurchasesPage() {
  const { readOnly } = useTenant()
  const { purchases: entries, ingredients, savePurchase } = useInventory()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [supplier, setSupplier] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(() => params.get('new') === '1')
  const presetId = params.get('item')

  const openSheet = (open: boolean) => {
    setSheetOpen(open)
    const next = new URLSearchParams(params)
    if (open) next.set('new', '1')
    else {
      next.delete('new')
      next.delete('item')
    }
    setParams(next, { replace: true })
  }

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (supplier === 'all' || e.supplier === supplier) &&
          (query === '' ||
            e.invoiceNo.toLowerCase().includes(query.toLowerCase()) ||
            e.supplier.toLowerCase().includes(query.toLowerCase())),
      ),
    [entries, query, supplier],
  )

  const monthSpend = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith('2026-08'))
        .reduce((sum, e) => sum + purchaseTotal(e), 0),
    [entries],
  )

  const save = (draft: Omit<PurchaseEntry, 'id' | 'createdAt'>) => {
    const entry = savePurchase(draft)
    toast.success(`Purchase ${entry.invoiceNo} saved`, {
      description: `${entry.lines.length} line${entry.lines.length === 1 ? '' : 's'} · ${inr(purchaseTotal(entry))} · stock updated`,
    })
  }

  return (
    <>
      <PageHeader
        title="Purchases"
        caption={`${entries.length} entries · ${inr(monthSpend)} spent this month`}
        actions={
          <Button disabled={readOnly} onClick={() => openSheet(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New entry
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice or supplier…"
            className="pl-9"
          />
        </div>
        <Select value={supplier} onValueChange={setSupplier}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={FileText}
            title="No purchases yet"
            description="Log a supplier invoice to raise stock and keep the ledger honest."
            action={
              <Button disabled={readOnly} onClick={() => openSheet(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> New entry
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => {
            const sub = purchaseSubtotal(entry)
            const gst = purchaseGst(entry)
            const total = purchaseTotal(entry)
            return (
              <Card key={entry.id} className="rounded-card border-line shadow-card">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold">{entry.invoiceNo}</h3>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {entry.date}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{entry.supplier}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-display text-lg font-bold tabular-nums">{inr(total)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {inr(sub)} + {inr(gst)} GST
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                    {entry.lines.map((line) => {
                      const item = ingredients.find((i) => i.id === line.ingredientId)
                      return (
                        <li
                          key={`${entry.id}-${line.ingredientId}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-medium">{item?.name ?? line.ingredientId}</span>
                            <span className="text-muted-foreground">
                              {' '}
                              · {line.qty} {item?.unit ?? ''}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {inr(line.qty * line.unitCost)}
                            <span className="ml-2 text-xs">@ {inr(line.unitCost)}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>

                  {entry.note && (
                    <p className={cn('mt-2 text-xs text-muted-foreground')}>{entry.note}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <PurchaseEntrySheet
        open={sheetOpen}
        onOpenChange={openSheet}
        presetIngredientId={presetId}
        readOnly={readOnly}
        onSave={save}
      />
    </>
  )
}
