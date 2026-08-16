import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Tags } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useTenant } from '@/hooks/use-tenant'
import { useInventory } from '@/hooks/use-inventory'
import { useInventoryCategories } from '@/hooks/use-inventory-masters'
import type { InventoryCategory } from '@/lib/mock'
import { cn } from '@/lib/utils'

/** Category master — used by ingredient filters and purchase classification. */
export function CategoriesPage() {
  const { readOnly } = useTenant()
  const { ingredients, upsertIngredient } = useInventory()
  const { categories: rows, setCategories: setRows } = useInventoryCategories()
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<{ open: boolean; item: InventoryCategory | null }>({
    open: false,
    item: null,
  })
  const [form, setForm] = useState({ name: '', description: '' })

  const countFor = (name: string) =>
    ingredients.filter((i) => i.category === name).length

  const filtered = useMemo(
    () =>
      rows.filter(
        (c) =>
          query === '' ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          (c.description?.toLowerCase().includes(query.toLowerCase()) ?? false),
      ),
    [rows, query],
  )

  const openAdd = () => {
    setForm({ name: '', description: '' })
    setDrawer({ open: true, item: null })
  }

  const openEdit = (item: InventoryCategory) => {
    setForm({ name: item.name, description: item.description ?? '' })
    setDrawer({ open: true, item })
  }

  const save = () => {
    const name = form.name.trim()
    if (!name) {
      toast.error('Category name is required')
      return
    }
    const description = form.description.trim() || undefined

    if (drawer.item) {
      const oldName = drawer.item.name
      if (name !== oldName && rows.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        toast.error('A category with that name already exists')
        return
      }
      setRows((prev) =>
        prev.map((c) =>
          c.id === drawer.item!.id ? { ...c, name, description } : c,
        ),
      )
      // Keep ingredient.category names in sync when renamed.
      if (oldName !== name) {
        for (const ing of ingredients) {
          if (ing.category === oldName) upsertIngredient({ ...ing, category: name })
        }
      }
      toast.success(`${name} updated`)
    } else {
      if (rows.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        toast.error('A category with that name already exists')
        return
      }
      const next: InventoryCategory = {
        id: `cat-${Date.now()}`,
        name,
        description,
      }
      setRows((prev) => [...prev, next])
      toast.success(`${name} added to master`)
    }
    setDrawer({ open: false, item: null })
  }

  const remove = (item: InventoryCategory) => {
    const count = countFor(item.name)
    if (count > 0) {
      toast.error(`Cannot delete — ${count} ingredient${count === 1 ? '' : 's'} use this category`)
      return
    }
    setRows((prev) => prev.filter((c) => c.id !== item.id))
    toast.success(`${item.name} removed`)
  }

  return (
    <>
      <PageHeader
        title="Categories"
        caption={`${rows.length} categories · classify ingredients in the master`}
        actions={
          <Button disabled={readOnly} onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add category
          </Button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Add categories so ingredients can be grouped in stock and purchases."
            action={
              <Button disabled={readOnly} onClick={openAdd}>
                <Plus className="mr-1.5 h-4 w-4" /> Add category
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cat) => {
            const count = countFor(cat.name)
            return (
              <Card key={cat.id} className="rounded-card border-line shadow-card">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold">{cat.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cat.description || 'No description'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                      {count} item{count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={readOnly}
                      onClick={() => openEdit(cat)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn('text-danger hover:text-danger', count > 0 && 'opacity-40')}
                      disabled={readOnly}
                      onClick={() => remove(cat)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Sheet open={drawer.open} onOpenChange={(open) => setDrawer((d) => ({ ...d, open }))}>
        <SheetContent className="w-full sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>{drawer.item ? `Edit ${drawer.item.name}` : 'Add category'}</SheetTitle>
            <SheetDescription>
              Categories group ingredients on stock filters and the master list.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Dairy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What belongs in this category…"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawer({ open: false, item: null })}>
              Cancel
            </Button>
            <Button disabled={readOnly} onClick={save}>
              {drawer.item ? 'Save changes' : 'Add category'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
