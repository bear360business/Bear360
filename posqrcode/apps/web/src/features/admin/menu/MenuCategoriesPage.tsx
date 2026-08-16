import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
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
import { useAuth } from '@/hooks/use-auth'
import { useMenu, newCategoryId } from '@/hooks/use-menu'
import { useTenant } from '@/hooks/use-tenant'
import type { MenuCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

const EMOJI_PRESETS = ['🥘', '🍛', '🥥', '🫓', '🍚', '🌶️', '🍮', '🍹', '🥗', '🍜', '🧁', '☕']

/** Category master — owner-only; drives Menu item filters and the add/edit category dropdown. */
export function MenuCategoriesPage() {
  const { session } = useAuth()
  const { readOnly } = useTenant()
  const { categories, items, upsertCategory, removeCategory } = useMenu()

  if (session?.role === 'staff') {
    return <Navigate to="/menu" replace />
  }
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<{ open: boolean; item: MenuCategory | null }>({
    open: false,
    item: null,
  })
  const [form, setForm] = useState({ name: '', emoji: '🥘', sortOrder: '1' })

  const filtered = useMemo(
    () =>
      categories.filter(
        (c) =>
          query === '' ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.id.toLowerCase().includes(query.toLowerCase()),
      ),
    [categories, query],
  )

  const itemCount = (id: string) => items.filter((i) => i.categoryId === id).length

  const openAdd = () => {
    const nextOrder = Math.max(0, ...categories.map((c) => c.sortOrder)) + 1
    setForm({ name: '', emoji: '🥘', sortOrder: String(nextOrder) })
    setDrawer({ open: true, item: null })
  }

  const openEdit = (item: MenuCategory) => {
    setForm({
      name: item.name,
      emoji: item.emoji,
      sortOrder: String(item.sortOrder),
    })
    setDrawer({ open: true, item })
  }

  const save = () => {
    const name = form.name.trim()
    if (!name) {
      toast.error('Category name is required')
      return
    }
    if (
      categories.some(
        (c) =>
          c.name.toLowerCase() === name.toLowerCase() && c.id !== drawer.item?.id,
      )
    ) {
      toast.error('A category with that name already exists')
      return
    }
    const payload: MenuCategory = {
      id: drawer.item?.id ?? newCategoryId(name),
      name,
      emoji: form.emoji || '🥘',
      sortOrder: Math.max(1, Number(form.sortOrder) || 1),
    }
    upsertCategory(payload)
    toast.success(drawer.item ? `${name} updated` : `${name} added to master`)
    setDrawer({ open: false, item: null })
  }

  const remove = (item: MenuCategory) => {
    const result = removeCategory(item.id)
    if (!result.ok) {
      toast.error(`Cannot delete — ${result.reason}`)
      return
    }
    toast.success(`${item.name} removed`)
  }

  return (
    <>
      <PageHeader
        title="Categories"
        caption="Master list for menu items — used in filters and the item form"
        actions={
          <Button className="rounded-full font-semibold" disabled={readOnly} onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add category
          </Button>
        }
      />

      <div className="mb-4 relative max-w-md">
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
            title={query ? 'No categories match' : 'No categories yet'}
            description={
              query
                ? 'Try a different search.'
                : 'Add categories like Starters, Breads, Beverages — then assign dishes to them.'
            }
            action={
              !query ? (
                <Button className="rounded-full font-semibold" disabled={readOnly} onClick={openAdd}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add category
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cat) => {
            const count = itemCount(cat.id)
            return (
              <Card key={cat.id} className="rounded-card border-line shadow-card">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-xl">
                    {cat.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-bold">{cat.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {count} item{count === 1 ? '' : 's'} · sort {cat.sortOrder}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={readOnly}
                        onClick={() => openEdit(cat)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={readOnly}
                        className="text-danger hover:text-danger"
                        onClick={() => remove(cat)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Sheet
        open={drawer.open}
        onOpenChange={(open) => !open && setDrawer({ open: false, item: null })}
      >
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{drawer.item ? `Edit ${drawer.item.name}` : 'Add category'}</SheetTitle>
            <SheetDescription>
              Categories appear as tabs on Menu and in the item form dropdown.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Starters"
              />
            </div>
            <div className="space-y-2">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors',
                      form.emoji === e
                        ? 'border-brand bg-brand-tint'
                        : 'border-line hover:bg-surface-muted',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Input
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                className="mt-2 w-24"
                maxLength={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-sort">Sort order</Label>
              <Input
                id="cat-sort"
                type="number"
                min={1}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
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
