import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Archive, Plus, RotateCcw, ShoppingBag } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useShop } from '@/hooks/use-shop'
import {
  SHOP_CATEGORY_META,
  blankShopProduct,
  shopCategoryLabel,
  type ShopCategory,
  type ShopProduct,
} from '@/lib/shop-catalog'
import { cn } from '@/lib/utils'

const IMAGE_PRESETS = [
  { value: '/shop/acrylic-qr-stand.svg', label: 'Acrylic stand' },
  { value: '/shop/wooden-qr-sign.svg', label: 'Wooden sign' },
  { value: '/shop/acrylic-standee.svg', label: 'Acrylic standee' },
  { value: '/shop/mobile-printer.svg', label: 'Mobile printer' },
  { value: '/shop/thermal-printer-80mm.svg', label: '80mm printer' },
]

/** Super Admin — manage QR stands & shop catalog shown in restaurant Shop. */
export function SuperShopPage() {
  const { products, create, update, archive, restore, remove, reset } = useShop()
  const [filter, setFilter] = useState<'all' | ShopCategory | 'archived'>('qr-stand')
  const [editor, setEditor] = useState<ShopProduct | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ShopProduct | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'archived') return products.filter((p) => p.archived)
    if (filter === 'all') return products.filter((p) => !p.archived)
    return products.filter((p) => !p.archived && p.category === filter)
  }, [products, filter])

  const qrCount = products.filter((p) => p.category === 'qr-stand' && !p.archived).length
  const activeCount = products.filter((p) => !p.archived).length

  const openCreate = () => {
    setIsNew(true)
    setEditor(
      blankShopProduct({
        category: filter === 'printer' || filter === 'accessory' ? filter : 'qr-stand',
        sortOrder: products.length + 1,
      }),
    )
  }

  const openEdit = (p: ShopProduct) => {
    setIsNew(false)
    setEditor(structuredClone(p))
  }

  const saveEditor = () => {
    if (!editor) return
    if (!editor.name.trim()) {
      toast.error('Product name is required')
      return
    }
    if (editor.price < 0) {
      toast.error('Price must be 0 or more')
      return
    }
    if (isNew) {
      create(editor)
      toast.success(`${editor.name} added to shop`)
    } else {
      update(editor.id, editor)
      toast.success(`${editor.name} updated`)
    }
    setEditor(null)
  }

  return (
    <>
      <PageHeader
        title="QR stands & shop"
        caption={`${qrCount} QR stands · ${activeCount} live products · restaurant Shop reads this catalog`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                reset()
                toast.success('Shop catalog reset to defaults')
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
            <Button className="rounded-full font-semibold" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> Add product
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-full bg-surface-muted p-1 w-fit">
        {(
          [
            ['qr-stand', 'QR stands'],
            ['printer', 'Printers'],
            ['accessory', 'Accessories'],
            ['all', 'All live'],
            ['archived', 'Archived'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              filter === id ? 'bg-surface text-foreground shadow-card' : 'text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="p-6">
            <EmptyState
              icon={ShoppingBag}
              title={filter === 'archived' ? 'No archived products' : 'No products in this view'}
              description="Add a QR stand or hardware item — restaurants see active products in Shop."
              action={
                <Button className="rounded-full font-semibold" onClick={openCreate}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add product
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className={cn(
                'flex flex-col overflow-hidden rounded-card border-line shadow-card',
                p.archived && 'opacity-70',
              )}
            >
              <div className="relative aspect-[4/3] shrink-0 bg-surface-muted">
                <img src={p.image} alt={p.alt || p.name} className="h-full w-full object-cover" />
                <span className="absolute right-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-white">
                  ₹{p.price.toFixed(2)}
                </span>
                <span className="absolute left-3 top-3 rounded-full bg-ink-900/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {shopCategoryLabel(p.category)}
                </span>
              </div>
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="text-sm font-semibold leading-snug">{p.name}</h3>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </Button>
                  {p.archived ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        restore(p.id)
                        toast.success(`${p.name} restored to shop`)
                      }}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        archive(p.id)
                        toast.success(`${p.name} archived`)
                      }}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-danger hover:text-danger"
                    onClick={() => setDeleteTarget(p)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Add shop product' : 'Edit product'}</DialogTitle>
            <DialogDescription>
              Changes appear instantly in restaurant Shop for active products.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto py-1">
              <div className="space-y-2">
                <Label htmlFor="shop-name">Name *</Label>
                <Input
                  id="shop-name"
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  placeholder="Acrylic QR code stand"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-desc">Description</Label>
                <Textarea
                  id="shop-desc"
                  rows={2}
                  value={editor.description}
                  onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shop-price">Price (₹)</Label>
                  <Input
                    id="shop-price"
                    type="number"
                    min={0}
                    step={1}
                    value={editor.price}
                    onChange={(e) =>
                      setEditor({ ...editor, price: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editor.category}
                    onValueChange={(v) =>
                      setEditor({ ...editor, category: v as ShopCategory })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOP_CATEGORY_META.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Image preset</Label>
                  <Select
                    value={editor.image}
                    onValueChange={(v) => setEditor({ ...editor, image: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_PRESETS.map((img) => (
                        <SelectItem key={img.value} value={img.value}>
                          {img.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-sort">Sort order</Label>
                  <Input
                    id="shop-sort"
                    type="number"
                    value={editor.sortOrder}
                    onChange={(e) =>
                      setEditor({ ...editor, sortOrder: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-alt">Image alt text</Label>
                <Input
                  id="shop-alt"
                  value={editor.alt}
                  onChange={(e) => setEditor({ ...editor, alt: e.target.value })}
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-line bg-surface-muted">
                <img
                  src={editor.image}
                  alt=""
                  className="mx-auto h-32 w-full max-w-xs object-contain p-2"
                />
              </div>
              <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <span className="text-sm font-medium">Archived (hidden from restaurant Shop)</span>
                <Switch
                  checked={editor.archived}
                  onCheckedChange={(archived) => setEditor({ ...editor, archived })}
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button className="rounded-full font-semibold" onClick={saveEditor}>
              {isNew ? 'Add product' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              Removes it from the catalog permanently. Prefer Archive if you might sell it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => {
                if (deleteTarget) {
                  remove(deleteTarget.id)
                  toast.success(`${deleteTarget.name} deleted`)
                }
                setDeleteTarget(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
