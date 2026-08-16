import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Plus, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  localDate,
  localMonth,
  useFinance,
  type FinanceCategory,
  type FinanceType,
} from '@/hooks/use-finance'

const EXPENSE_CATS: FinanceCategory[] = [
  'rent',
  'utilities',
  'supplies',
  'wages',
  'marketing',
  'misc',
]

/** Income / expenses ledger with KPIs (demo localStorage). */
export function FinancePage({
  embedded = false,
  /** Staff with expenses module but not manager — expense entry only. */
  expenseOnly = false,
}: {
  embedded?: boolean
  expenseOnly?: boolean
}) {
  const [month, setMonth] = useState(() => localMonth())
  const { records, add, remove, income, expenses, net, orderIncome } = useFinance(month)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FinanceType>('expense')
  const [form, setForm] = useState({
    category: 'misc' as FinanceCategory,
    description: '',
    amount: '',
    date: localDate(),
  })
  const [filter, setFilter] = useState<'all' | FinanceType>('all')

  const visible = useMemo(
    () => (filter === 'all' ? records : records.filter((r) => r.type === filter)),
    [records, filter],
  )

  const openSheet = (type: FinanceType) => {
    setKind(type)
    const dayInMonth = `${month}-01`
    setForm({
      category: type === 'income' ? 'other-income' : 'misc',
      description: '',
      amount: '',
      date: localMonth() === month ? localDate() : dayInMonth,
    })
    setOpen(true)
  }

  const save = () => {
    const amount = Number(form.amount)
    if (!form.description.trim() || !amount || amount <= 0) {
      toast.error('Description and amount are required')
      return
    }
    add({
      type: kind,
      category: form.category,
      description: form.description.trim(),
      amount,
      date: form.date,
    })
    setMonth(form.date.slice(0, 7))
    toast.success(kind === 'income' ? 'Income added' : 'Expense added')
    setOpen(false)
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
        onClick={() => openSheet('expense')}
      >
        <Plus className="h-4 w-4" />
        Add Expense
      </Button>
      {!expenseOnly && (
        <Button type="button" className="rounded-full" onClick={() => openSheet('income')}>
          <Plus className="h-4 w-4" />
          Add Income
        </Button>
      )}
    </div>
  )

  return (
    <>
      {!embedded && (
        <PageHeader
          title="Finance & Expenses"
          caption="Track your income, daily expenses, and calculate net profits."
          actions={actions}
        />
      )}
      {embedded && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {expenseOnly
              ? 'Log daily expenses. Income entries need a manager.'
              : 'Income, expenses, and net profit for this venue.'}
          </p>
          {actions}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          label="Total income"
          value={income}
          tone="success"
          icon={ArrowUpRight}
          hint={orderIncome > 0 ? `incl. ₹${orderIncome.toLocaleString('en-IN')} from paid orders` : undefined}
        />
        <Kpi label="Total expenses" value={expenses} tone="danger" icon={ArrowDownRight} />
        <Kpi label="Net profit" value={net} tone="ink" icon={TrendingUp} />
      </div>

      <Card className="mt-6 rounded-card border-line shadow-card">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">Financial records</h2>
            <div className="flex flex-wrap gap-2">
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 w-40"
              />
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No records found for this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 pr-3 font-semibold">Category</th>
                    <th className="py-2 pr-3 font-semibold">Description</th>
                    <th className="py-2 pr-3 font-semibold">Amount</th>
                    <th className="py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-3">{r.date}</td>
                      <td className="py-2.5 pr-3 capitalize">{r.type}</td>
                      <td className="py-2.5 pr-3 capitalize text-muted-foreground">
                        {r.category.replace('-', ' ')}
                      </td>
                      <td className="py-2.5 pr-3">{r.description}</td>
                      <td
                        className={
                          r.type === 'income'
                            ? 'py-2.5 pr-3 font-semibold text-success'
                            : 'py-2.5 pr-3 font-semibold text-destructive'
                        }
                      >
                        {r.type === 'income' ? '+' : '−'}₹
                        {r.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5">
                        {r.fromOrder ? (
                          <span className="text-xs text-muted-foreground">Order</span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs font-semibold text-destructive"
                            onClick={() => {
                              remove(r.id)
                              toast.message('Record removed')
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{kind === 'income' ? 'Add income' : 'Add expense'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as FinanceCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(kind === 'income'
                    ? (['other-income', 'sales'] as FinanceCategory[])
                    : EXPENSE_CATS
                  ).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What is this for?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
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

function Kpi({
  label,
  value,
  tone,
  icon: Icon,
  hint,
}: {
  label: string
  value: number
  tone: 'success' | 'danger' | 'ink'
  icon: typeof ArrowUpRight
  hint?: string
}) {
  const color =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-destructive'
        : 'text-foreground'
  return (
    <Card className="rounded-card border-line shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <p className={`mt-2 font-display text-2xl font-bold ${color}`}>
          ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
