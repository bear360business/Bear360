import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, CreditCard, Download, Loader2, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/app/PageHeader'
import { PlanBadge } from '@/components/app/PlanBadge'
import { UsageMeter } from '@/components/app/UsageMeter'
import { useUpgrade } from '@/components/app/UpgradeDrawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/app/StatusBadge'
import { usePlans } from '@/hooks/use-plans'
import { useStaff } from '@/hooks/use-staff'
import { useTenant } from '@/hooks/use-tenant'
import { useBillingInvoices } from '@/hooks/use-billing-invoices'
import { apiBillingStatus } from '@/lib/api-billing'
import { inr } from '@/lib/currency'
import { usePlanCheckout } from '@/lib/razorpay-checkout'
import { useMockData } from '@/lib/runtime-config'
import {
  FEATURE_META,
  LIMIT_META,
  PLAN_FEATURES,
  PLAN_META,
  PLAN_ORDER,
  type FeatureKey,
  type LimitKey,
  type PlanId,
} from '@/lib/tenant'
import { cn } from '@/lib/utils'
import { resolveDataVenueId } from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'

const LIMIT_ORDER: LimitKey[] = ['staffSeats', 'tables', 'menuItems', 'ordersPerMonth', 'branches']

/** Features worth showing in the comparison table (the ones people buy for). */
const COMPARE: FeatureKey[] = [
  'qrOrdering',
  'pos',
  'kitchen',
  'inventory',
  'staff',
  'reportsAdvanced',
  'reportsCustom',
  'ai',
  'multiBranch',
]

/** Plan, usage against limits, comparison and invoices (v2 doc §8.8). */
export function BillingPage() {
  const { config, limit, setPlan } = useTenant()
  const { activeCount: staffSeatsUsed } = useStaff()
  const { plans: catalog } = usePlans()
  const { openUpgrade } = useUpgrade()
  const { start: startCheckout } = usePlanCheckout()
  const { invoices, appendForPlan } = useBillingInvoices()
  const mock = useMockData()
  const venueId = resolveDataVenueId()
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null)
  const [rzConfigured, setRzConfigured] = useState(false)
  const [subStatus, setSubStatus] = useState<string | null>(null)
  const grantsFor = (id: PlanId) =>
    catalog.find((p) => p.id === id)?.featureGrants ?? PLAN_FEATURES[id]
  const [params, setParams] = useSearchParams()
  const plan = PLAN_META[config.planId]

  useEffect(() => {
    if (mock || !venueId) return
    void apiBillingStatus(venueId)
      .then((s) => {
        setRzConfigured(s.configured)
        setSubStatus(s.subscriptionStatus)
      })
      .catch((err) => reportApiError(err))
  }, [mock, venueId, config.planId])

  // ?upgrade=<feature> deep-links straight into the drawer (doc §5.3).
  const upgradeParam = params.get('upgrade') as FeatureKey | null
  useEffect(() => {
    if (upgradeParam && FEATURE_META[upgradeParam]) {
      openUpgrade(upgradeParam)
      params.delete('upgrade')
      setParams(params, { replace: true })
    }
  }, [upgradeParam, openUpgrade, params, setParams])

  const changePlan = async (next: (typeof PLAN_ORDER)[number]) => {
    if (next === config.planId || busyPlan) return
    if (next === 'enterprise') {
      toast.message('Enterprise is custom pricing', {
        description: 'Contact sales for multi-branch contracts.',
      })
      return
    }
    setBusyPlan(next)
    try {
      await startCheckout({
        restaurantId: venueId,
        planId: next,
        planName: PLAN_META[next].name,
        onDemoApplied: (planId) => {
          setPlan(planId)
          appendForPlan(planId)
          toast.success(`Switched to ${PLAN_META[planId].name}`, {
            description: rzConfigured
              ? undefined
              : 'Razorpay keys not set — applied in demo mode. Add RAZORPAY_KEY_ID / SECRET to enable real billing.',
          })
        },
        onActivated: (planId) => {
          setPlan(planId)
          appendForPlan(planId)
          toast.success(`Subscribed to ${PLAN_META[planId].name}`, {
            description: 'Razorpay subscription activated.',
          })
        },
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'Checkout closed') {
        toast.message('Checkout cancelled')
      } else {
        toast.error(err instanceof Error ? err.message : 'Could not start checkout')
      }
    } finally {
      setBusyPlan(null)
      if (!mock) {
        void apiBillingStatus(venueId)
          .then((s) => {
            setRzConfigured(s.configured)
            setSubStatus(s.subscriptionStatus)
          })
          .catch((err) => reportApiError(err))
      }
    }
  }

  return (
    <>
      <PageHeader title="Billing" />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Current plan */}
        <Card className="rounded-card border-line shadow-card lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold">{plan.name}</h2>
                  <PlanBadge plan={config.planId} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-3 text-sm">
                  <span className="font-display text-2xl font-bold tabular-nums">
                    {plan.priceLabel}
                  </span>
                  {plan.priceMonthly !== null && (
                    <span className="text-muted-foreground"> / month</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {subStatus
                    ? `Subscription: ${subStatus}`
                    : config.status === 'trial'
                      ? `Trial ends ${config.renewsOn} (${config.trialDaysLeft} ${config.trialDaysLeft === 1 ? 'day' : 'days'} left)`
                      : `Renews ${config.renewsOn} · ${rzConfigured ? 'Razorpay' : 'demo billing'}`}
                </p>
              </div>
              {config.planId !== 'enterprise' && (
                <Button onClick={() => openUpgrade(config.planId === 'basic' ? 'pos' : 'ai')}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Upgrade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold">Payment method</h3>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-muted p-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {rzConfigured ? 'Razorpay Subscriptions' : 'Demo billing (no Razorpay keys)'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rzConfigured
                    ? 'Cards / UPI via Razorpay Checkout'
                    : 'Add RAZORPAY_KEY_ID + SECRET in apps/api/.env'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-3 w-full"
              disabled={!!busyPlan || config.planId === 'enterprise'}
              onClick={() => {
                const next =
                  config.planId === 'basic' ? 'professional' : ('basic' as const)
                void changePlan(config.planId === 'professional' ? 'basic' : next)
              }}
            >
              {busyPlan ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening checkout…
                </>
              ) : (
                'Change plan via Razorpay'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Usage */}
      <Card className="mt-4 rounded-card border-line shadow-card">
        <CardContent className="p-6">
          <h3 className="text-base font-semibold">Usage this period</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Limits come from your plan. Hitting one never deletes data — it blocks new records.
          </p>
          <div className="mt-4 space-y-4">
            {LIMIT_ORDER.map((key) => {
              const state = limit(key)
              const live =
                key === 'staffSeats' ? { ...state, used: staffSeatsUsed } : state
              return (
                <UsageMeter
                  key={key}
                  limitKey={key}
                  state={live}
                  action={
                    state.state === 'ok' || state.max === null ? undefined : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => openUpgrade(key === 'branches' ? 'multiBranch' : 'pos')}
                      >
                        Get more {LIMIT_META[key].unit}
                      </Button>
                    )
                  }
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <Card className="mt-4 rounded-card border-line shadow-card">
        <CardContent className="p-6">
          <h3 className="text-base font-semibold">Compare plans</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr>
                  <th className="w-[38%] pb-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Feature
                  </th>
                  {PLAN_ORDER.map((id) => (
                    <th key={id} className="pb-3 text-center">
                      <span
                        className={cn(
                          'inline-flex flex-col items-center gap-1 rounded-xl px-3 py-2',
                          id === config.planId && 'bg-brand-tint',
                        )}
                      >
                        <span className="text-sm font-semibold">{PLAN_META[id].name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {PLAN_META[id].priceLabel}
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARE.map((key) => (
                  <tr key={key}>
                    <td className="py-2.5 pr-4">{FEATURE_META[key].label}</td>
                    {PLAN_ORDER.map((id) => (
                      <td key={id} className="py-2.5 text-center">
                        {grantsFor(id)[key] ? (
                          <Check className="mx-auto h-4 w-4 text-brand" strokeWidth={3} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td />
                  {PLAN_ORDER.map((id) => (
                    <td key={id} className="pt-4 text-center">
                      {id === config.planId ? (
                        <span className="text-xs font-semibold text-muted-foreground">
                          Current plan
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!!busyPlan}
                          variant={
                            PLAN_ORDER.indexOf(id) > PLAN_ORDER.indexOf(config.planId)
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() => void changePlan(id)}
                        >
                          {busyPlan === id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : PLAN_ORDER.indexOf(id) > PLAN_ORDER.indexOf(config.planId) ? (
                            'Upgrade'
                          ) : (
                            'Downgrade'
                          )}
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Downgrading keeps all your data — the modules it covers become read-only until you
            upgrade again.
          </p>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card className="mt-4 rounded-card border-line shadow-card">
        <CardContent className="p-6">
          <h3 className="text-base font-semibold">Invoices</h3>
          {invoices.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No invoices yet — they appear when you subscribe or change plan.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-line">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tabular-nums">{invoice.id}</p>
                    <p className="text-xs text-muted-foreground">{invoice.date}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{inr(invoice.amount)}</p>
                  <StatusBadge
                    status={invoice.status === 'paid' ? 'completed' : 'pending'}
                    label={invoice.status === 'paid' ? 'Paid' : 'Open'}
                  />
                  <Button variant="ghost" size="icon" aria-label={`Download ${invoice.id}`}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
