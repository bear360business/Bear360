import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRestaurants } from '@/hooks/use-restaurants'
import { apiBillingStatus, type BillingStatus } from '@/lib/api-billing'
import { startPlanCheckout } from '@/lib/razorpay-checkout'
import { reportApiError } from '@/lib/api-error'
import { PLAN_META, PLAN_ORDER, type PlanId, type TenantStatus } from '@/lib/tenant'
import { cn } from '@/lib/utils'

type RestaurantBillingRow = {
  id: string
  name: string
  ownerEmail: string
  planId: string
  billing: BillingStatus | null
  loading: boolean
  error: string | null
}

function SubStatusIcon({ status }: { status: string | null }) {
  if (!status) return <AlertCircle className="h-4 w-4 text-muted-foreground" />
  if (['active', 'authenticated', 'charged'].includes(status))
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  if (['cancelled', 'halted', 'expired'].includes(status))
    return <XCircle className="h-4 w-4 text-red-500" />
  return <AlertCircle className="h-4 w-4 text-amber-500" />
}

function PlanChip({ planId }: { planId: string }) {
  const meta = PLAN_META[planId as PlanId]
  if (!meta) return <Badge variant="outline">{planId}</Badge>
  return (
    <Badge
      className={cn(
        'font-semibold capitalize',
        planId === 'enterprise' && 'bg-purple-600 text-white',
        planId === 'professional' && 'bg-blue-600 text-white',
        planId === 'basic' && 'bg-emerald-600 text-white',
        (planId === 'free' || !planId) && 'bg-muted text-muted-foreground',
      )}
    >
      {meta.name}
    </Badge>
  )
}

/** Super admin — manage Razorpay billing & subscription status for all restaurants. */
export function SuperBillingPage() {
  const { restaurants, update: updateRestaurant, setStatus } = useRestaurants()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<RestaurantBillingRow[]>([])
  const [selected, setSelected] = useState<RestaurantBillingRow | null>(null)
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null)
  const [targetPlan, setTargetPlan] = useState<PlanId | 'keep'>('keep')
  const [manualPlan, setManualPlan] = useState<PlanId>('basic')
  const [updatingManual, setUpdatingManual] = useState(false)

  useEffect(() => {
    setRows(
      restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        ownerEmail: r.ownerEmail ?? '',
        planId: r.planId ?? 'basic',
        billing: null,
        loading: false,
        error: null,
      })),
    )
  }, [restaurants])

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
      r.planId.toLowerCase().includes(search.toLowerCase()),
  )

  const patchRow = (id: string, patch: Partial<RestaurantBillingRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const fetchBilling = async (id: string) => {
    patchRow(id, { loading: true, error: null })
    try {
      const billing = await apiBillingStatus(id)
      patchRow(id, { billing, loading: false, planId: billing.planId })
      setSelected((prev) =>
        prev?.id === id ? { ...prev, billing, loading: false, planId: billing.planId } : prev,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load billing'
      patchRow(id, { loading: false, error: msg })
      setSelected((prev) => (prev?.id === id ? { ...prev, loading: false, error: msg } : prev))
    }
  }

  const selectRow = (row: RestaurantBillingRow) => {
    setSelected(row)
    setTargetPlan('keep')
    setManualPlan((row.planId as PlanId) || 'basic')
    if (!row.billing && !row.loading) void fetchBilling(row.id)
  }

  const runCheckout = async (restaurantId: string, planId: PlanId) => {
    setBusyPlan(planId)
    try {
      await startPlanCheckout({
        restaurantId,
        planId,
        planName: PLAN_META[planId]?.name ?? planId,
        prefill: selected
          ? {
              name: selected.name,
              email: selected.ownerEmail,
            }
          : undefined,
        onDemoApplied: (pid) => {
          toast.success(`Plan set to ${PLAN_META[pid]?.name ?? pid}`, {
            description: 'Demo mode — Razorpay keys not set or simulated.',
          })
          void fetchBilling(restaurantId)
        },
        onActivated: (pid) => {
          toast.success(`Subscribed to ${PLAN_META[pid]?.name ?? pid}`)
          void fetchBilling(restaurantId)
        },
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'Checkout closed') {
        toast.message('Checkout cancelled')
      } else {
        reportApiError(err, 'Checkout failed')
      }
    } finally {
      setBusyPlan(null)
    }
  }

  const handleManualPlanChange = async (newPlan: PlanId) => {
    if (!selected) return
    setUpdatingManual(true)
    try {
      await updateRestaurant(selected.id, { planId: newPlan })
      patchRow(selected.id, { planId: newPlan })
      setSelected((prev) => (prev ? { ...prev, planId: newPlan } : null))
      toast.success(`Updated ${selected.name} to ${PLAN_META[newPlan]?.name ?? newPlan} plan`)
      void fetchBilling(selected.id)
    } catch (err) {
      reportApiError(err, 'Failed to update plan')
    } finally {
      setUpdatingManual(false)
    }
  }

  const handleManualStatusChange = async (status: TenantStatus) => {
    if (!selected) return
    try {
      setStatus(selected.id, status as any)
      toast.success(`Updated status to ${status}`)
      void fetchBilling(selected.id)
    } catch (err) {
      reportApiError(err, 'Failed to update status')
    }
  }

  const currentPlan = selected?.billing?.planId ?? selected?.planId

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Super Admin Billing & Payments"
        caption="Monitor subscriptions, run Razorpay checkouts, and override plans across all restaurant tenants."
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* ── Left: restaurant list ── */}
        <Card className="h-fit rounded-xl border-line shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All Restaurants ({rows.length})
            </CardTitle>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="super-billing-search"
                placeholder="Search name / email / plan…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {rows.length === 0 ? 'Loading restaurants…' : 'No matching restaurants'}
              </p>
            ) : (
              <ul className="divide-y divide-line max-h-[calc(100vh-280px)] overflow-y-auto">
                {filtered.map((row) => (
                  <li key={row.id}>
                    <button
                      id={`super-billing-row-${row.id}`}
                      onClick={() => selectRow(row)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted',
                        selected?.id === row.id && 'bg-surface-muted',
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.ownerEmail}</p>
                      </div>
                      <PlanChip planId={row.billing?.planId ?? row.planId} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── Right: billing detail ── */}
        {selected ? (
          <div className="space-y-5">
            {/* Restaurant header */}
            <Card className="rounded-xl border-line shadow-card">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{selected.name}</h2>
                    <PlanChip planId={currentPlan ?? 'basic'} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{selected.ownerEmail}</p>
                  <p className="text-xs font-mono text-muted-foreground/70 mt-1">ID: {selected.id}</p>
                </div>
                <Button
                  id="super-billing-refresh"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBilling(selected.id)}
                  disabled={selected.loading}
                >
                  {selected.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Refresh Status</span>
                </Button>
              </CardContent>
            </Card>

            {selected.error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{selected.error}</span>
              </div>
            )}

            {selected.loading && !selected.billing && (
              <Card className="rounded-xl border-line shadow-card">
                <CardContent className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading billing details from backend…
                </CardContent>
              </Card>
            )}

            {selected.billing && (
              <>
                {/* Status grid */}
                <Card className="rounded-xl border-line shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-brand" />
                      Subscription &amp; Gateway Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        {
                          label: 'Active Plan',
                          value: <PlanChip planId={selected.billing.planId} />,
                        },
                        {
                          label: 'Account Status',
                          value: (
                            <Badge variant="outline" className="capitalize text-xs font-medium">
                              {selected.billing.status}
                            </Badge>
                          ),
                        },
                        {
                          label: 'Razorpay Subscription',
                          value: (
                            <span className="flex items-center gap-1.5 text-sm capitalize font-medium">
                              <SubStatusIcon status={selected.billing.subscriptionStatus} />
                              {selected.billing.subscriptionStatus ?? 'None / Not Subscribed'}
                            </span>
                          ),
                        },
                        {
                          label: 'Gateway Mode',
                          value: (
                            <span className="flex items-center gap-1.5 text-sm">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              {selected.billing.configured ? 'Razorpay Live / Test Key' : 'Demo Mode (No Keys)'}
                            </span>
                          ),
                        },
                        ...(selected.billing.razorpaySubscriptionId
                          ? [
                              {
                                label: 'Subscription ID',
                                value: (
                                  <span className="font-mono text-xs break-all text-brand font-medium">
                                    {selected.billing.razorpaySubscriptionId}
                                  </span>
                                ),
                              },
                            ]
                          : []),
                        ...(selected.billing.razorpayCustomerId
                          ? [
                              {
                                label: 'Customer ID',
                                value: (
                                  <span className="font-mono text-xs break-all">
                                    {selected.billing.razorpayCustomerId}
                                  </span>
                                ),
                              },
                            ]
                          : []),
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-surface-muted p-3">
                          <p className="mb-1 text-xs text-muted-foreground">{label}</p>
                          {value}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Razorpay Online Checkout */}
                <Card className="rounded-xl border-line shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-brand" />
                      Razorpay Online Subscription Checkout
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Opens the Razorpay checkout modal directly on this page to initiate or renew an automated monthly subscription for <strong>{selected.name}</strong>.
                    </p>

                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[220px]">
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          Target Paid Plan
                        </label>
                        <Select
                          value={targetPlan}
                          onValueChange={(v) => setTargetPlan(v as PlanId | 'keep')}
                        >
                          <SelectTrigger id="super-billing-plan-select">
                            <SelectValue placeholder="Select plan…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="keep">— Choose a plan to checkout —</SelectItem>
                            {PLAN_ORDER.filter((p) => p !== 'enterprise').map((p) => (
                              <SelectItem key={p} value={p}>
                                {PLAN_META[p].name} — ₹{PLAN_META[p].priceMonthly}/mo
                                {currentPlan === p ? ' (Current)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        id="super-billing-checkout-btn"
                        className="bg-brand text-brand-foreground hover:bg-brand/90"
                        disabled={targetPlan === 'keep' || !!busyPlan}
                        onClick={() => {
                          if (targetPlan === 'keep') return
                          void runCheckout(selected.id, targetPlan)
                        }}
                      >
                        {busyPlan ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Launching Checkout…
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Open Razorpay Checkout
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="pt-3 border-t border-line">
                      <p className="mb-2 text-xs text-muted-foreground font-medium">Quick checkout presets:</p>
                      <div className="flex flex-wrap gap-2">
                        {PLAN_ORDER.filter((p) => p !== 'enterprise').map((p) => (
                          <Button
                            key={p}
                            id={`super-billing-quick-${p}`}
                            variant={currentPlan === p ? 'default' : 'outline'}
                            size="sm"
                            disabled={!!busyPlan}
                            onClick={() => void runCheckout(selected.id, p)}
                          >
                            {busyPlan === p && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            <Zap className="mr-1.5 h-3.5 w-3.5" />
                            {PLAN_META[p].name} (₹{PLAN_META[p].priceMonthly}/mo)
                            {currentPlan === p && ' ✓'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Direct Plan & Status Override (Manual Super Admin control) */}
                <Card className="rounded-xl border-line shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-brand" />
                      Direct Plan &amp; Account Override (Super Admin Bypass)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Directly change tenant entitlement plan or extend trial without requiring Razorpay payment.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Assign Plan Directly</label>
                        <div className="flex gap-2">
                          <Select
                            value={manualPlan}
                            onValueChange={(v) => setManualPlan(v as PlanId)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLAN_ORDER.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {PLAN_META[p].name} ({PLAN_META[p].short})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="secondary"
                            disabled={updatingManual || manualPlan === currentPlan}
                            onClick={() => void handleManualPlanChange(manualPlan)}
                          >
                            {updatingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Account Status Quick Actions</label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleManualStatusChange('trial')}
                          >
                            Set Trial
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleManualStatusChange('active')}
                          >
                            Set Active
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => void handleManualStatusChange('suspended')}
                          >
                            Suspend
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        ) : (
          <Card className="rounded-xl border-line shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-24 text-center">
              <CreditCard className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p className="text-base font-medium">Select a restaurant</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose any tenant from the list to inspect subscription status, open Razorpay checkout, or override entitlements.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
