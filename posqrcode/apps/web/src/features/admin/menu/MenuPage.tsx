import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ImagePlus, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import { AdminMenuItemCard } from '@/components/app/MenuItemCard'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useIndustryCopy } from '@/hooks/use-industry-copy'
import { useMenu } from '@/hooks/use-menu'
import { usePageState } from '@/hooks/use-page-state'
import { useStaff } from '@/hooks/use-staff'
import { useTenant } from '@/hooks/use-tenant'
import { resolveStaffCapabilities } from '@/lib/staff-capabilities'
import type { MenuItem } from '@/lib/types'

type FormState = {
  name: string
  price: string
  categoryId: string
  description: string
  veg: boolean
  spicy: boolean
  available: boolean
  image: string
}

const emptyForm = (categoryId: string): FormState => ({
  name: '',
  price: '',
  categoryId,
  description: '',
  veg: true,
  spicy: false,
  available: true,
  image: '',
})

/** Menu management: category tabs, search, availability, add/edit drawer (doc §6.10). */
export function MenuPage() {
  const state = usePageState()
  const { readOnly: tenantReadOnly } = useTenant()
  const { session } = useAuth()
  const { employees } = useStaff()
  const staffEmp =
    session?.role === 'staff'
      ? employees.find((e) => e.id === session.employeeId)
      : undefined
  const staffCanEdit = staffEmp ? resolveStaffCapabilities(staffEmp).editMenu : true
  const isStaff = session?.role === 'staff'
  const readOnly = tenantReadOnly || (isStaff && !staffCanEdit)
  const copy = useIndustryCopy()
  const { categories, items, upsertItem, removeItem, setAvailable } = useMenu()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'all'
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<{ open: boolean; item: MenuItem | null }>({
    open: false,
    item: null,
  })
  const [form, setForm] = useState<FormState>(() => emptyForm(categories[0]?.id ?? ''))
  const fileRef = useRef<HTMLInputElement>(null)

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (category === 'all' || item.categoryId === category) &&
          (query === '' || item.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [items, category, query],
  )

  const setCategory = (value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('category')
    else next.set('category', value)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (category !== 'all' && !categories.some((c) => c.id === category)) {
      setCategory('all')
    }
  }, [categories, category]) // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => {
    setForm(emptyForm(sortedCategories[0]?.id ?? ''))
    setDrawer({ open: true, item: null })
  }

  const openEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      price: String(item.price),
      categoryId: item.categoryId,
      description: item.description,
      veg: item.veg,
      spicy: item.spicy,
      available: item.available,
      image: item.image,
    })
    setDrawer({ open: true, item })
  }

  const onPickImage = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((f) => ({ ...f, image: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
  }

  const save = () => {
    const name = form.name.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    if (!form.categoryId) {
      toast.error('Pick a category from the master list')
      return
    }
    if (!categories.some((c) => c.id === form.categoryId)) {
      toast.error('Category not found — add it under Menu → Categories')
      return
    }
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Enter a valid price')
      return
    }

    const payload: MenuItem = {
      id: drawer.item?.id ?? `item-${Date.now().toString(36)}`,
      name,
      price,
      categoryId: form.categoryId,
      description: form.description.trim(),
      veg: form.veg,
      spicy: form.spicy,
      available: form.available,
      image:
        form.image ||
        drawer.item?.image ||
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=640&q=80',
      ...(drawer.item?.popular ? { popular: true } : {}),
    }
    upsertItem(payload)
    toast.success(drawer.item ? `${name} updated` : `${name} added to menu`)
    setDrawer({ open: false, item: null })
  }

  const onDelete = () => {
    if (!drawer.item) return
    removeItem(drawer.item.id)
    toast.success(`${drawer.item.name} deleted`)
    setDrawer({ open: false, item: null })
  }

  return (
    <>
      <PageHeader
        title={copy.catalog}
        caption={`${items.length} items · ${categories.length} categories`}
        actions={
          <div className="flex gap-2">
            {!isStaff && (
              <Button variant="outline" className="rounded-full" asChild>
                <Link to="/inventory/items">Map recipes</Link>
              </Button>
            )}
            {!isStaff && categories.length === 0 && (
              <Button variant="outline" className="rounded-full" asChild>
                <Link to="/menu/categories">Add categories first</Link>
              </Button>
            )}
            <Button
              className="rounded-full font-semibold"
              disabled={readOnly || categories.length === 0}
              onClick={openAdd}
            >
              + Add item
            </Button>
          </div>
        }
      />

      {isStaff && (
        <p className="mb-4 rounded-card border border-line bg-surface-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
          Categories and menu appearance are managed by the restaurant owner. You can{' '}
          {staffCanEdit ? 'edit dishes' : 'view dishes'} only.
        </p>
      )}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="w-full justify-start overflow-x-auto lg:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {sortedCategories.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            className="pl-9"
          />
        </div>
      </div>

      {state === 'loading' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LoadingSkeleton variant="menu-item" count={6} />
        </div>
      )}

      {state !== 'loading' && items.length === 0 && (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={UtensilsCrossed}
            title="Your menu is empty"
            description={
              categories.length === 0
                ? isStaff
                  ? 'Ask your manager to create categories first.'
                  : 'Create a category master first, then add dishes.'
                : 'Add your first dish so guests can start ordering.'
            }
            action={
              categories.length === 0 ? (
                isStaff ? undefined : (
                  <Button className="rounded-full font-semibold" asChild>
                    <Link to="/menu/categories">Go to Categories</Link>
                  </Button>
                )
              ) : (
                <Button
                  className="rounded-full font-semibold"
                  disabled={readOnly}
                  onClick={openAdd}
                >
                  + Add item
                </Button>
              )
            }
          />
        </div>
      )}

      {state !== 'loading' &&
        items.length > 0 &&
        (filtered.length === 0 ? (
          <div className="rounded-card border border-line bg-surface shadow-card">
            <EmptyState
              icon={Search}
              title={query ? `No dishes match "${query}"` : 'No dishes in this category'}
              description="Try a different filter or add an item."
              action={
                query ? (
                  <Button variant="outline" className="rounded-full" onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <AdminMenuItemCard
                key={item.id}
                item={item}
                available={item.available}
                onToggleAvailable={(a) => {
                  if (readOnly) return
                  setAvailable(item.id, a)
                  toast.success(`${item.name} ${a ? 'available' : 'marked sold out'}`)
                }}
                onEdit={() => openEdit(item)}
              />
            ))}
          </div>
        ))}

      <Sheet
        open={drawer.open}
        onOpenChange={(open) => !open && setDrawer({ open: false, item: null })}
      >
        <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>{drawer.item ? `Edit ${drawer.item.name}` : 'Add menu item'}</SheetTitle>
            <SheetDescription>
              {drawer.item
                ? 'Update the dish details.'
                : 'Category comes from the master list — new dishes appear on QR and POS instantly.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 py-6">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={readOnly}
              onClick={() => fileRef.current?.click()}
              className="relative flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-line text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
            >
              {form.image ? (
                <img src={form.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs font-medium">Upload image (16:9)</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Name</Label>
                <Input
                  id="item-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Butter Chicken"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-price">Price (₹)</Label>
                <Input
                  id="item-price"
                  type="number"
                  min={0}
                  step="1"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                {sortedCategories.length === 0 ? (
                  <p className="rounded-md border border-dashed border-line px-3 py-2 text-xs text-muted-foreground">
                    {isStaff ? (
                      'No categories — ask your manager to add them.'
                    ) : (
                      <>
                        No categories —{' '}
                        <Link to="/menu/categories" className="underline underline-offset-2">
                          add in master
                        </Link>
                      </>
                    )}
                  </p>
                ) : (
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.emoji} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Vegetarian</Label>
                <div className="flex h-10 items-center">
                  <Switch
                    checked={form.veg}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, veg: v }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-desc">Description</Label>
              <Textarea
                id="item-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short guest-facing description"
              />
            </div>

            <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
              <span className="text-sm font-medium">Spicy</span>
              <Switch
                checked={form.spicy}
                onCheckedChange={(v) => setForm((f) => ({ ...f, spicy: v }))}
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
              <span className="text-sm font-medium">Available</span>
              <Switch
                checked={form.available}
                onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))}
              />
            </label>
          </div>

          <SheetFooter className="gap-2 sm:justify-between">
            {drawer.item ? (
              <Button
                variant="ghost"
                className="rounded-full text-danger hover:text-danger"
                disabled={readOnly}
                onClick={onDelete}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setDrawer({ open: false, item: null })}
              >
                Cancel
              </Button>
              <Button
                className="rounded-full font-semibold"
                disabled={readOnly || sortedCategories.length === 0}
                onClick={save}
              >
                Save item
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
