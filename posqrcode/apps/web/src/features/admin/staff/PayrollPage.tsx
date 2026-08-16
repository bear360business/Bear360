import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, Clock, Download, Info, Lock, Wallet } from 'lucide-react'
import { FeatureGate } from '@/components/app/FeatureGate'
import { PageHeader } from '@/components/app/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStaff } from '@/hooks/use-staff'
import { usePayroll } from '@/hooks/use-staff-ops'
import { useTenant } from '@/hooks/use-tenant'
import { inr } from '@/lib/currency'
import { getRole, initials } from '@/lib/mock'
import type { PayrollRow } from '@/lib/types'
import { cn } from '@/lib/utils'

type PeriodId = 'current' | 'jul' | 'jun'

type PeriodDef = {
  id: PeriodId
  label: string
  locked?: boolean
  scale: number
  otBoost: number
}

const PERIODS: PeriodDef[] = [
  { id: 'current', label: 'Current period', scale: 1, otBoost: 0 },
  { id: 'jul', label: '1–31 Jul 2026', locked: true, scale: 4.1, otBoost: 1 },
  { id: 'jun', label: '1–30 Jun 2026', locked: true, scale: 3.9, otBoost: 0.5 },
]

function buildPeriodRows(base: PayrollRow[], period: PeriodDef): PayrollRow[] {
  if (period.id === 'current') return base.map((r) => ({ ...r }))
  return base.map((r) => {
    const hours = Math.round(r.hours * period.scale)
    const overtimeHours = Math.round((r.overtimeHours + period.otBoost) * (period.scale > 1 ? 1.2 : 1))
    const billable = hours + overtimeHours * 0.5
    const gross = Math.round(billable * r.rate)
    const deductions = Math.round(gross * 0.045)
    return {
      employeeId: r.employeeId,
      hours,
      overtimeHours,
      rate: r.rate,
      gross,
      deductions,
      net: gross - deductions,
    }
  })
}

function totalsOf(rows: PayrollRow[]) {
  return rows.reduce(
    (acc, r) => ({
      hours: acc.hours + r.hours,
      overtimeHours: acc.overtimeHours + r.overtimeHours,
      gross: acc.gross + r.gross,
      deductions: acc.deductions + r.deductions,
      net: acc.net + r.net,
    }),
    { hours: 0, overtimeHours: 0, gross: 0, deductions: 0, net: 0 },
  )
}

function toCsv(
  rows: { name: string; role: string; row: PayrollRow }[],
  periodLabel: string,
  totals: ReturnType<typeof totalsOf>,
) {
  const lines = [
    `Payroll summary,${periodLabel}`,
    'Employee,Role,Hours,OT,Rate,Gross,Deductions,Net',
    ...rows.map(
      ({ name, role, row }) =>
        `"${name}",${role},${row.hours},${row.overtimeHours},${row.rate},${row.gross},${row.deductions},${row.net}`,
    ),
    `Totals,,${totals.hours},${totals.overtimeHours},,${totals.gross},${totals.deductions},${totals.net}`,
  ]
  return lines.join('\n')
}

function PayrollContent() {
  const { readOnly, features } = useTenant()
  const { employees } = useStaff()
  const {
    rows: payrollBase,
    periodLabel,
    approvedCurrent,
    setApprovedCurrent,
  } = usePayroll()
  const [periodId, setPeriodId] = useState<PeriodId>('current')

  const period =
    periodId === 'current'
      ? { ...PERIODS[0], label: periodLabel }
      : (PERIODS.find((p) => p.id === periodId) ?? PERIODS[0])

  const rows = useMemo(() => {
    const base = payrollBase.map((r) => {
      const live = employees.find((e) => e.id === r.employeeId)
      return live ? { ...r, rate: live.hourlyRate } : { ...r }
    })
    // Recompute gross/net for current period when rates change from staff edits.
    const withRates = base.map((r) => {
      if (periodId !== 'current') return r
      const billable = r.hours + r.overtimeHours * 0.5
      const gross = Math.round(billable * r.rate)
      const deductions = Math.round(gross * 0.045)
      return { ...r, gross, deductions, net: gross - deductions }
    })
    return buildPeriodRows(withRates, period)
  }, [employees, period, periodId, payrollBase])

  const tableRows = useMemo(
    () =>
      rows
        .map((row) => {
          const emp = employees.find((e) => e.id === row.employeeId)
          if (!emp || emp.status === 'inactive') return null
          return { name: emp.name, role: getRole(emp.roleId).name, row }
        })
        .filter((x): x is { name: string; role: string; row: PayrollRow } => x != null),
    [employees, rows],
  )

  const totals = useMemo(() => totalsOf(tableRows.map((t) => t.row)), [tableRows])
  const isLocked = period.locked || (periodId === 'current' && approvedCurrent)

  const exportCsv = () => {
    if (!features.export) {
      toast('Export needs Professional+', {
        description: 'CSV export is included from the Professional plan.',
      })
      return
    }
    const csv = toCsv(tableRows, period.label, totals)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bear360-payroll-${periodId}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Payroll exported', {
      description: `${tableRows.length} people · ${period.label}`,
    })
  }

  const approvePeriod = () => {
    if (periodId !== 'current' || approvedCurrent) return
    setApprovedCurrent(true)
    toast.success('Period approved', {
      description: 'Ready to export to your payroll provider.',
    })
  }

  return (
    <>
      <PageHeader
        title="Payroll"
        caption="Review hours, approve the period, then export for your payroll provider."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodId} onValueChange={(v) => setPeriodId(v as PeriodId)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                    {p.locked || (p.id === 'current' && approvedCurrent) ? ' · Locked' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLocked && periodId === 'current' && (
              <Button disabled={readOnly} onClick={approvePeriod}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve period
              </Button>
            )}
            <Button variant="outline" disabled={readOnly} onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'On payroll',
            value: String(tableRows.length),
            sub: 'people this period',
            icon: Wallet,
          },
          {
            label: 'Hours',
            value: String(totals.hours),
            sub: `${totals.overtimeHours}h overtime`,
            icon: Clock,
          },
          {
            label: 'Gross',
            value: inr(totals.gross),
            sub: 'before deductions',
            icon: Wallet,
          },
          {
            label: 'Net pay',
            value: inr(totals.net),
            sub: 'export this amount',
            icon: Wallet,
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-card border border-line bg-surface p-4 shadow-card"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <k.icon className="h-3.5 w-3.5" />
              {k.label}
            </div>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">{k.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <p className="flex flex-1 items-start gap-2 rounded-card border border-line bg-surface-muted/60 px-4 py-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Labour cost summary only — Bear 360 does not disburse salaries.{' '}
            <Link to="/staff/attendance" className="font-medium text-foreground underline-offset-2 hover:underline">
              Check attendance
            </Link>{' '}
            before approving.
          </span>
        </p>
        {isLocked && (
          <p className="flex items-center gap-2 rounded-card border border-success/30 bg-success-tint/30 px-4 py-3 text-xs font-medium text-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Period locked — export anytime
          </p>
        )}
      </div>

      <Card className="rounded-card border-line shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted/50 text-left">
                  <Th className="pl-4">Employee</Th>
                  <Th className="text-right">Hours</Th>
                  <Th className="text-right">OT</Th>
                  <Th className="text-right">Rate</Th>
                  <Th className="text-right">Gross</Th>
                  <Th className="text-right">Deductions</Th>
                  <Th className="pr-4 text-right">Net</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tableRows.map(({ name, role, row }) => (
                  <tr key={row.employeeId} className="hover:bg-surface-muted/40">
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-brand/20 text-[10px] font-semibold">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-right tabular-nums">{row.hours}</td>
                    <td className="px-3 text-right tabular-nums text-muted-foreground">
                      {row.overtimeHours || '—'}
                    </td>
                    <td className="px-3 text-right tabular-nums text-muted-foreground">
                      {inr(row.rate)}/h
                    </td>
                    <td className="px-3 text-right tabular-nums">{inr(row.gross)}</td>
                    <td className="px-3 text-right tabular-nums text-muted-foreground">
                      {inr(row.deductions)}
                    </td>
                    <td className="pr-4 text-right tabular-nums font-semibold">{inr(row.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-surface-muted/40 font-semibold">
                  <td className="py-3 pl-4">Totals</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totals.hours}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totals.overtimeHours}</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right tabular-nums">{inr(totals.gross)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{inr(totals.deductions)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{inr(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

/** A17 Payroll — gated by the `payroll` sub-feature. */
export function PayrollPage() {
  return (
    <FeatureGate feature="payroll">
      <PayrollContent />
    </FeatureGate>
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
