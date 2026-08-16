import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Mail, MapPin, Phone, Plus, Search, User } from 'lucide-react'
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
import { useTenant } from '@/hooks/use-tenant'
import { useInventory } from '@/hooks/use-inventory'
import { useSuppliers } from '@/hooks/use-inventory-masters'
import { inr } from '@/lib/currency'
import { purchaseTotal, type Supplier } from '@/lib/mock'
import { cn } from '@/lib/utils'

type FormState = {
  name: string
  phone: string
  email: string
  city: string
  contactPerson: string
  gstin: string
}

const emptyForm = (): FormState => ({
  name: '',
  phone: '',
  email: '',
  city: '',
  contactPerson: '',
  gstin: '',
})

/** A12 Suppliers master — cards with contact, items, last order, spend MTD. */
export function SuppliersPage() {
  const { readOnly } = useTenant()
  const { ingredients, purchases, upsertIngredient } = useInventory()
  const { suppliers: rows, setSuppliers: setRows } = useSuppliers()
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<{ open: boolean; item: Supplier | null }>({
    open: false,
    item: null,
  })
  const [form, setForm] = useState<FormState>(emptyForm)

  const supplierItemCount = (name: string) =>
    ingredients.filter((i) => i.supplier === name).length

  const supplierSpendMtd = (name: string) => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    return purchases
      .filter((p) => {
        if (p.supplier !== name) return false
        const d = new Date(p.date)
        return d.getFullYear() === y && d.getMonth() === m
      })
      .reduce((sum, p) => sum + purchaseTotal(p), 0)
  }

  const supplierLastOrder = (name: string) => {
    const hits = purchases
      .filter((p) => p.supplier === name)
      .map((p) => p.date)
      .sort()
      .reverse()
    return hits[0]
  }

  const filtered = useMemo(
    () =>
      rows.filter(
        (s) =>
          query === '' ||
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          (s.city?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
          (s.contactPerson?.toLowerCase().includes(query.toLowerCase()) ?? false),
      ),
    [rows, query],
  )

  const openAdd = () => {
    setForm(emptyForm())
    setDrawer({ open: true, item: null })
  }

  const openEdit = (item: Supplier) => {
    setForm({
      name: item.name,
      phone: item.phone,
      email: item.email ?? '',
      city: item.city ?? '',
      contactPerson: item.contactPerson ?? '',
      gstin: item.gstin ?? '',
    })
    setDrawer({ open: true, item })
  }

  const save = () => {
    const name = form.name.trim()
    const phone = form.phone.trim()
    if (!name || !phone) {
      toast.error('Name and phone are required')
      return
    }

    const payload: Omit<Supplier, 'id'> = {
      name,
      phone,
      email: form.email.trim() || undefined,
      city: form.city.trim() || undefined,
      contactPerson: form.contactPerson.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
    }

    if (drawer.item) {
      const oldName = drawer.item.name
      if (
        name !== oldName &&
        rows.some((s) => s.name.toLowerCase() === name.toLowerCase())
      ) {
        toast.error('A supplier with that name already exists')
        return
      }
      setRows((prev) =>
        prev.map((s) => (s.id === drawer.item!.id ? { ...s, ...payload } : s)),
      )
      if (oldName !== name) {
        for (const ing of ingredients) {
          if (ing.supplier === oldName) upsertIngredient({ ...ing, supplier: name })
        }
      }
      toast.success(`${name} updated`)
    } else {
      if (rows.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        toast.error('A supplier with that name already exists')
        return
      }
      const next: Supplier = { id: `sup-${Date.now()}`, ...payload }
      setRows((prev) => [...prev, next])
      toast.success(`${name} added to master`)
    }
    setDrawer({ open: false, item: null })
  }

  const remove = (item: Supplier) => {
    const count = supplierItemCount(item.name)
    if (count > 0) {
      toast.error(`Cannot delete — ${count} ingredient${count === 1 ? '' : 's'} linked`)
      return
    }
    setRows((prev) => prev.filter((s) => s.id !== item.id))
    toast.success(`${item.name} removed`)
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        caption={`${rows.length} suppliers · contact, items supplied and spend this month`}
        actions={
          <Button disabled={readOnly} onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add supplier
          </Button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search suppliers…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={Building2}
            title="No suppliers yet"
            description="Add suppliers to the master before logging purchases against them."
            action={
              <Button disabled={readOnly} onClick={openAdd}>
                <Plus className="mr-1.5 h-4 w-4" /> Add supplier
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((sup) => {
            const items = supplierItemCount(sup.name)
            const spend = supplierSpendMtd(sup.name)
            const last = supplierLastOrder(sup.name)
            return (
              <Card key={sup.id} className="rounded-card border-line shadow-card">
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <div>
                    <h3 className="font-display text-base font-bold">{sup.name}</h3>
                    {sup.contactPerson && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3.5 w-3.5" /> {sup.contactPerson}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 tabular-nums">
                      <Phone className="h-3.5 w-3.5 shrink-0" /> {sup.phone}
                    </p>
                    {sup.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" /> {sup.email}
                      </p>
                    )}
                    {sup.city && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {sup.city}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2 rounded-xl bg-surface-muted/50 px-3 py-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Items
                      </p>
                      <p className="font-semibold tabular-nums">{items}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Last PO
                      </p>
                      <p className="text-xs font-semibold tabular-nums">{last ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        MTD
                      </p>
                      <p className="text-xs font-semibold tabular-nums">{inr(spend)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={readOnly}
                      onClick={() => openEdit(sup)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn('text-danger hover:text-danger', items > 0 && 'opacity-40')}
                      disabled={readOnly}
                      onClick={() => remove(sup)}
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
        <SheetContent className="w-full overflow-y-auto sm:max-w-[440px]">
          <SheetHeader>
            <SheetTitle>{drawer.item ? `Edit ${drawer.item.name}` : 'Add supplier'}</SheetTitle>
            <SheetDescription>
              Suppliers appear on purchase entry and the ingredient master.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="sup-name">Name</Label>
              <Input
                id="sup-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Amul Distributors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sup-phone">Phone</Label>
                <Input
                  id="sup-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98XXX XXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-city">City</Label>
                <Input
                  id="sup-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Mumbai"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-contact">Contact person</Label>
              <Input
                id="sup-contact"
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                placeholder="Suresh Patel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-email">Email</Label>
              <Input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="orders@supplier.in"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-gstin">GSTIN</Label>
              <Input
                id="sup-gstin"
                value={form.gstin}
                onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
                placeholder="27AABCA1234A1Z5"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawer({ open: false, item: null })}>
              Cancel
            </Button>
            <Button disabled={readOnly} onClick={save}>
              {drawer.item ? 'Save changes' : 'Add supplier'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
