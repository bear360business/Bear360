import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  IndianRupee,
  PackageX,
  Plus,
  Search,
  Trash2,
  TrendingDown,
} from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { StatCard } from '@/components/app/StatCard'
import { StockDot, StockLevelBar } from '@/components/app/StockLevelBar'
import { PurchaseEntrySheet } from '@/features/admin/inventory/PurchaseEntrySheet'
import { WastageSheet } from '@/features/admin/inventory/WastageSheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  daysOfCover,
  getCategoryNames,
  purchaseSubtotal,
  stockLevel,
  stockValue,
  type Ingredient,
  type PurchaseEntry,
} from '@/lib/mock'
import { cn } from '@/lib/utils'

type LevelFilter = 'all' | 'attention' | 'ok'

/** Stock overview — the Inventory module's home screen (v2 doc §8.4). */
export function InventoryPage() {
  const { readOnly } = useTenant()
  const navigate = useNavigate()
  const {
    ingredients: stock,
    stockValue: stockValueTotal,
    alertCount: attention,
    outCount,
    wastageValue,
    savePurchase: persistPurchase,
    adjustStock,
  } = useInventory()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [level, setLevel] = useState<LevelFilter>('all')
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [wastageOpen, setWastageOpen] = useState(false)
  const [presetIngredientId, setPresetIngredientId] = useState<string | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null)
  const [adjustQty, setAdjustQty] = useState('')

  const rows = useMemo(
    () =>
      stock.filter((item) => {
        const l = stockLevel(item)
        const matchesLevel =
          level === 'all' ||
          (level === 'attention' ? l === 'low' || l === 'out' : l === 'ok' || l === 'watch')
        return (
          matchesLevel &&
          (category === 'all' || item.category === category) &&
          (query === '' || item.name.toLowerCase().includes(query.toLowerCase()))
        )
      }),
    [stock, query, category, level],
  )

  const filtered = query !== '' || category !== 'all' || level !== 'all'

  const openPurchase = (ingredientId?: string) => {
    setPresetIngredientId(ingredientId ?? null)
    setPurchaseOpen(true)
  }

  const openWastage = (ingredientId?: string) => {
    setPresetIngredientId(ingredientId ?? null)
    setWastageOpen(true)
  }

  const savePurchase = (draft: Omit<PurchaseEntry, 'id' | 'createdAt'>) => {
    const entry = persistPurchase(draft)
    toast.success(`Purchase ${entry.invoiceNo} saved`, {
      description: `Stock updated · ${inr(purchaseSubtotal(entry))} before GST`,
    })
  }

  const openAdjust = (item: Ingredient) => {
    setAdjustTarget(item)
    setAdjustQty(String(item.stock))
  }

  const saveAdjust = () => {
    if (!adjustTarget) return
    const qty = Number(adjustQty)
    if (Number.isNaN(qty) || qty < 0) {
      toast.error('Enter a valid stock quantity')
      return
    }
    adjustStock(adjustTarget.id, qty)
    toast.success(`${adjustTarget.name} stock set to ${qty} ${adjustTarget.unit}`)
    setAdjustTarget(null)
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        caption="Purchase raises stock · recipes deduct on kitchen ready / served (or paid if enabled)"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/inventory/items">Recipes</Link>
            </Button>
            <Button variant="outline" disabled={readOnly} onClick={() => openWastage()}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Record wastage
            </Button>
            <Button disabled={readOnly} onClick={() => openPurchase()}>
              <Plus className="mr-1.5 h-4 w-4" /> Purchase entry
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          stat={{ id: 'value', label: 'Stock value', value: inr(stockValueTotal) }}
          icon={IndianRupee}
        />
        <StatCard
          stat={{
            id: 'attention',
            label: 'Needs attention',
            value: String(attention),
            tone: attention > 0 ? 'warning' : 'default',
          }}
          icon={AlertTriangle}
        />
        <StatCard
          stat={{
            id: 'out',
            label: 'Out of stock',
            value: String(outCount),
            tone: outCount > 0 ? 'danger' : 'default',
          }}
          icon={PackageX}
        />
        <StatCard
          stat={{ id: 'wastage', label: 'Wastage (month)', value: inr(wastageValue) }}
          icon={TrendingDown}
        />
      </div>

      <p className="mt-4 rounded-card border border-line bg-surface-muted/60 px-4 py-3 text-xs text-muted-foreground">
        Loop: Purchase raises stock → map recipes on Ingredients → kitchen Mark done (ready) or
        served/completed deducts stock. Settings → Service can also deduct on paid. Use Adjust for
        count corrections.
      </p>

      <Card className="mt-4 rounded-card border-line shadow-card">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ingredients…"
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {getCategoryNames().map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={(v) => setLevel(v as LevelFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Stock level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="attention">Needs attention</SelectItem>
                <SelectItem value="ok">Healthy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Search}
                title={filtered ? 'No ingredients match these filters' : 'No ingredients yet'}
                description={
                  filtered
                    ? 'Try a different search or clear the filters.'
                    : 'Add ingredients to track stock automatically as you bill.'
                }
                action={
                  filtered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuery('')
                        setCategory('all')
                        setLevel('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <table className="hidden w-full text-sm lg:table">
                <thead>
                  <tr className="border-b border-line bg-surface-muted/50 text-left">
                    <Th className="pl-4">Ingredient</Th>
                    <Th className="text-right">Stock</Th>
                    <Th>Level</Th>
                    <Th className="text-right">Days left</Th>
                    <Th className="text-right">Reorder at</Th>
                    <Th className="text-right">Value</Th>
                    <Th>Supplier</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((item) => (
                    <Row
                      key={item.id}
                      item={item}
                      readOnly={readOnly}
                      onPurchase={() => openPurchase(item.id)}
                      onWastage={() => openWastage(item.id)}
                      onHistory={() => navigate('/inventory/purchases')}
                      onAdjust={() => openAdjust(item)}
                    />
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-line lg:hidden">
                {rows.map((item) => {
                  const l = stockLevel(item)
                  const days = daysOfCover(item)
                  return (
                    <li key={item.id} className="flex items-center gap-3 p-4">
                      <StockDot level={l} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category} ·{' '}
                          <span className="tabular-nums">
                            {item.stock} {item.unit}
                          </span>
                          {days !== null && ` · ${days}d left`}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={readOnly}
                          onClick={() => openAdjust(item)}
                        >
                          Adjust
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={readOnly}
                          onClick={() => openPurchase(item.id)}
                        >
                          Buy
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Showing {rows.length} of {stock.length} ingredients
      </p>

      <PurchaseEntrySheet
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        presetIngredientId={presetIngredientId}
        readOnly={readOnly}
        onSave={savePurchase}
      />
      <Dialog open={adjustTarget != null} onOpenChange={(open) => !open && setAdjustTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust stock — {adjustTarget?.name}</DialogTitle>
            <DialogDescription>
              Set the counted quantity on hand ({adjustTarget?.unit}). This overwrites the current
              stock figure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="adjust-qty">New stock qty</Label>
            <Input
              id="adjust-qty"
              type="number"
              min={0}
              step="0.001"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setAdjustTarget(null)}>
              Cancel
            </Button>
            <Button className="rounded-full font-semibold" onClick={saveAdjust}>
              Save stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WastageSheet
        open={wastageOpen}
        onOpenChange={setWastageOpen}
        presetIngredientId={presetIngredientId}
        readOnly={readOnly}
      />
    </>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        className,
      )}
    >
      {children}
    </th>
  )
}

function Row({
  item,
  readOnly,
  onPurchase,
  onWastage,
  onHistory,
  onAdjust,
}: {
  item: Ingredient
  readOnly: boolean
  onPurchase: () => void
  onWastage: () => void
  onHistory: () => void
  onAdjust: () => void
}) {
  const level = stockLevel(item)
  const days = daysOfCover(item)

  return (
    <tr className="hover:bg-surface-muted/40">
      <td className="py-3 pl-4 pr-3">
        <span className="flex items-center gap-2">
          <StockDot level={level} />
          <span className="font-medium">{item.name}</span>
        </span>
        <span className="ml-4 text-xs text-muted-foreground">{item.category}</span>
      </td>
      <td className="px-3 text-right tabular-nums">
        {item.stock} {item.unit}
      </td>
      <td className="px-3">
        <StockLevelBar level={level} ratio={item.stock / (item.reorder * 3 || 1)} />
      </td>
      <td
        className={cn(
          'px-3 text-right tabular-nums',
          days !== null && days <= 2 && 'font-semibold text-danger',
        )}
      >
        {days === null ? '—' : `${days} d`}
      </td>
      <td className="px-3 text-right tabular-nums text-muted-foreground">
        {item.reorder} {item.unit}
      </td>
      <td className="px-3 text-right tabular-nums">{inr(stockValue(item))}</td>
      <td className="px-3 text-muted-foreground">{item.supplier}</td>
      <td className="pr-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`}>
              ⋮
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={readOnly} onSelect={onAdjust}>
              Adjust stock
            </DropdownMenuItem>
            <DropdownMenuItem disabled={readOnly} onSelect={onPurchase}>
              Add purchase
            </DropdownMenuItem>
            <DropdownMenuItem disabled={readOnly} onSelect={onWastage}>
              Record wastage
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onHistory}>View purchases</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}
