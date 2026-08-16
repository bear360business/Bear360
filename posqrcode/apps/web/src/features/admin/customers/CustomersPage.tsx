import { useMemo, useState } from 'react'
import { Download, Plus, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createCustomerDraft, useCustomers } from '@/hooks/use-customers'

/** Guest CRM — spending & visits from orders + manual contacts. */
export function CustomersPage() {
  const { rows, upsert, remove } = useCustomers()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })

  const filtered = useMemo(
    () =>
      rows.filter(
        (c) =>
          !query ||
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query),
      ),
    [rows, query],
  )

  const save = () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    upsert(createCustomerDraft(form))
    toast.success(`Added ${form.name.trim()}`)
    setOpen(false)
    setForm({ name: '', phone: '', email: '', notes: '' })
  }

  const exportCsv = () => {
    const lines = [
      'Name,Phone,Email,Orders,Spend,LastVisit',
      ...filtered.map(
        (c) =>
          `"${c.name}","${c.phone}","${c.email ?? ''}",${c.orders},${c.spend},${c.lastVisit ?? ''}`,
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported customers.csv')
  }

  return (
    <>
      <PageHeader
        title="Customer CRM"
        caption="Manage your customer database, track spending, and view order history."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customers..."
                className="h-10 w-48 pl-9 sm:w-56"
              />
            </div>
            <Button type="button" variant="outline" className="rounded-full" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              type="button"
              className="rounded-full"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        }
      />

      <Card className="rounded-card border-line shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  <th className="px-4 py-3 font-semibold">Metrics</th>
                  <th className="px-4 py-3 font-semibold">Last visit</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8">
                      <EmptyState
                        icon={Users}
                        title="No customers found"
                        description="Add a contact or place orders with a guest name to build your CRM."
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>{c.phone || '—'}</div>
                        {c.email && <div className="text-xs">{c.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.orders} orders · ₹{c.spend.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.lastVisit
                          ? new Date(c.lastVisit).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!c.id.startsWith('auto-') && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-destructive"
                            onClick={() => {
                              remove(c.id)
                              toast.message('Customer removed')
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add customer</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Guest name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="guest@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Preferences, allergies…"
              />
            </div>
          </div>
          <SheetFooter className="mt-8">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
