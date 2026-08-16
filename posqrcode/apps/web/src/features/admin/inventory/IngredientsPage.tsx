import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Package, Plus, Search, Link2 } from 'lucide-react'
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
import { useInventory } from '@/hooks/use-inventory'
import { useInventoryCategories, useSuppliers } from '@/hooks/use-inventory-masters'
import { useMenu } from '@/hooks/use-menu'
import { useTenant } from '@/hooks/use-tenant'
import { inr } from '@/lib/currency'
import type { Ingredient, StockUnit } from '@/lib/mock'
import { cn } from '@/lib/utils'

const UNITS: StockUnit[] = ['kg', 'g', 'L', 'ml', 'pc']

type FormState = {
  name: string
  category: string
  unit: StockUnit
  reorder: string
  costPerUnit: string
  supplier: string
  dailyUse: string
}

/** A9 Ingredient master — list + add/edit + recipe mapping (doc §8.4). */
export function IngredientsPage() {
  const { readOnly } = useTenant()
  const { ingredients: items, recipes, upsertIngredient, saveRecipes } = useInventory()
  const { categories: invCategories } = useInventoryCategories()
  const { suppliers: supplierRows } = useSuppliers()
  const { items: menuItems } = useMenu()
  const categoryNames = invCategories.map((c) => c.name)
  const supplierNames = supplierRows.map((s) => s.name)

  const emptyForm = (): FormState => ({
    name: '',
    category: categoryNames[0] ?? 'General',
    unit: 'kg',
    reorder: '5',
    costPerUnit: '0',
    supplier: supplierNames[0] ?? '',
    dailyUse: '1',
  })

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [drawer, setDrawer] = useState<{ open: boolean; item: Ingredient | null }>({
    open: false,
    item: null,
  })
  const [form, setForm] = useState<FormState>(emptyForm)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapMenuId, setMapMenuId] = useState('')
  const [draftRecipes, setDraftRecipes] = useState(recipes)

  // Prefer first live menu item when opening mapper / when menu hydrates.
  useEffect(() => {
    if (!mapMenuId && menuItems[0]?.id) setMapMenuId(menuItems[0].id)
  }, [menuItems, mapMenuId])

  // Keep the mapping sheet draft in sync when opened / when provider recipes change.
  const openMap = () => {
    setDraftRecipes(recipes)
    if (!mapMenuId && menuItems[0]?.id) setMapMenuId(menuItems[0].id)
    setMapOpen(true)
  }

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (category === 'all' || i.category === category) &&
          (query === '' || i.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [items, query, category],
  )

  const openAdd = () => {
    setForm(emptyForm())
    setDrawer({ open: true, item: null })
  }

  const openEdit = (item: Ingredient) => {
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      reorder: String(item.reorder),
      costPerUnit: String(item.costPerUnit),
      supplier: item.supplier,
      dailyUse: String(item.dailyUse),
    })
    setDrawer({ open: true, item })
  }

  const save = () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      reorder: Math.max(0, Number(form.reorder) || 0),
      costPerUnit: Math.max(0, Number(form.costPerUnit) || 0),
      supplier: form.supplier,
      dailyUse: Math.max(0, Number(form.dailyUse) || 0),
    }
    if (drawer.item) {
      upsertIngredient({ ...drawer.item, ...payload })
      toast.success(`${payload.name} updated`)
    } else {
      const next: Ingredient = {
        id: `ing-${Date.now()}`,
        ...payload,
        stock: 0,
      }
      upsertIngredient(next)
      toast.success(`${next.name} added to master`)
    }
    setDrawer({ open: false, item: null })
  }

  const mapLines = draftRecipes[mapMenuId] ?? []
  const mapMenu = menuItems.find((m) => m.id === mapMenuId)
  const plateCost = mapLines.reduce((sum, line) => {
    const ing = items.find((i) => i.id === line.ingredientId)
    return sum + (ing ? line.qty * ing.costPerUnit : 0)
  }, 0)
  const margin =
    mapMenu && mapMenu.price > 0
      ? Math.round(((mapMenu.price - plateCost) / mapMenu.price) * 100)
      : null

  const addMapLine = () => {
    const used = new Set(mapLines.map((l) => l.ingredientId))
    const next = items.find((i) => !used.has(i.id))
    if (!next) {
      toast('All master ingredients are already on this recipe')
      return
    }
    setDraftRecipes((prev) => ({
      ...prev,
      [mapMenuId]: [...(prev[mapMenuId] ?? []), { ingredientId: next.id, qty: 0.05 }],
    }))
  }

  return (
    <>
      <PageHeader
        title="Ingredients"
        caption={`${items.length} items · used by purchases, stock and recipe costing`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openMap}>
              <Link2 className="mr-1.5 h-4 w-4" /> Recipe mapping
            </Button>
            <Button disabled={readOnly} onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" /> Add ingredient
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search master list…"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryNames.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={Package}
            title="No ingredients in master"
            description="Add master items first — purchases can only pull from this list."
            action={
              <Button disabled={readOnly} onClick={openAdd}>
                <Plus className="mr-1.5 h-4 w-4" /> Add ingredient
              </Button>
            }
          />
        </div>
      ) : (
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-muted/50 text-left">
                    <Th className="pl-4">Name</Th>
                    <Th>Category</Th>
                    <Th>Unit</Th>
                    <Th className="text-right">Reorder</Th>
                    <Th className="text-right">Cost / unit</Th>
                    <Th>Supplier</Th>
                    <Th className="text-right">On hand</Th>
                    <Th className="pr-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-muted/40">
                      <td className="py-3 pl-4 font-medium">{item.name}</td>
                      <td className="px-3 text-muted-foreground">{item.category}</td>
                      <td className="px-3 tabular-nums">{item.unit}</td>
                      <td className="px-3 text-right tabular-nums text-muted-foreground">
                        {item.reorder}
                      </td>
                      <td className="px-3 text-right tabular-nums">{inr(item.costPerUnit)}</td>
                      <td className="px-3 text-muted-foreground">{item.supplier}</td>
                      <td className="px-3 text-right tabular-nums">
                        {item.stock} {item.unit}
                      </td>
                      <td className="pr-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={readOnly}
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Purchase entry only lists items from this master. Add here before buying.
      </p>

      {/* Add / Edit master item */}
      <Sheet open={drawer.open} onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[440px]">
          <SheetHeader>
            <SheetTitle>
              {drawer.item ? `Edit ${drawer.item.name}` : 'Add ingredient'}
            </SheetTitle>
            <SheetDescription>
              Master data for stock, purchases and recipe costing.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="ing-name">Name</Label>
              <Input
                id="ing-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Paneer"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm((f) => ({ ...f, unit: v as StockUnit }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder">Reorder at</Label>
                <Input
                  id="reorder"
                  type="number"
                  min={0}
                  value={form.reorder}
                  onChange={(e) => setForm((f) => ({ ...f, reorder: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Cost / unit (₹)</Label>
                <Input
                  id="cost"
                  type="number"
                  min={0}
                  value={form.costPerUnit}
                  onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Default supplier</Label>
                <Select
                  value={form.supplier}
                  onValueChange={(v) => setForm((f) => ({ ...f, supplier: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  {supplierRows.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="daily">Avg daily use</Label>
                <Input
                  id="daily"
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.dailyUse}
                  onChange={(e) => setForm((f) => ({ ...f, dailyUse: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawer({ open: false, item: null })}>
              Cancel
            </Button>
            <Button disabled={readOnly} onClick={save}>
              {drawer.item ? 'Save changes' : 'Add to master'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Recipe mapping */}
      <Sheet open={mapOpen} onOpenChange={setMapOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Recipe mapping</SheetTitle>
            <SheetDescription>
              Link menu items to master ingredients so stock deducts on every sale.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            {menuItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-foreground">
                No live menu items yet — add dishes under Menu, then map recipes here.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label>Menu item</Label>
              <Select
                value={mapMenuId}
                onValueChange={setMapMenuId}
                disabled={menuItems.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select menu item" />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} · {inr(m.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-line bg-surface-muted/40 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per plate</span>
                <span className="font-semibold tabular-nums">{inr(plateCost)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Margin</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    margin !== null && margin < 40 ? 'text-warning' : 'text-success',
                  )}
                >
                  {margin === null ? '—' : `${margin}%`}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ingredients from master</Label>
                <Button type="button" size="sm" variant="outline" onClick={addMapLine}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {mapLines.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-foreground">
                  No master ingredients linked — pick from the master list.
                </p>
              ) : (
                <ul className="space-y-2">
                  {mapLines.map((line, idx) => {
                    const ing = items.find((i) => i.id === line.ingredientId)
                    return (
                      <li
                        key={`${line.ingredientId}-${idx}`}
                        className="flex items-center gap-2 rounded-xl border border-line p-2"
                      >
                        <Select
                          value={line.ingredientId}
                          onValueChange={(v) =>
                            setDraftRecipes((prev) => ({
                              ...prev,
                              [mapMenuId]: (prev[mapMenuId] ?? []).map((l, i) =>
                                i === idx ? { ...l, ingredientId: v } : l,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Pick from master" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name} ({i.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          step="0.001"
                          className="w-24"
                          value={line.qty}
                          onChange={(e) =>
                            setDraftRecipes((prev) => ({
                              ...prev,
                              [mapMenuId]: (prev[mapMenuId] ?? []).map((l, i) =>
                                i === idx ? { ...l, qty: Number(e.target.value) || 0 } : l,
                              ),
                            }))
                          }
                        />
                        <span className="w-8 text-xs text-muted-foreground">{ing?.unit}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-muted-foreground hover:text-danger"
                          onClick={() =>
                            setDraftRecipes((prev) => ({
                              ...prev,
                              [mapMenuId]: (prev[mapMenuId] ?? []).filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          ×
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button
              onClick={() => {
                saveRecipes(draftRecipes)
                toast.success('Recipe mapping saved', {
                  description: 'Stock will deduct from these recipes on served/completed orders.',
                })
                setMapOpen(false)
              }}
            >
              Save mapping
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
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
