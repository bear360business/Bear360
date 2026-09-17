import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useBillingInvoices } from '@/hooks/use-billing-invoices'
import { useTenant } from '@/hooks/use-tenant'
import { inr } from '@/lib/currency'
import { usePlanCheckout } from '@/lib/razorpay-checkout'
import {
  FEATURE_META,
  PLAN_META,
  PLAN_ORDER,
  planFor,
  type FeatureKey,
} from '@/lib/tenant'
import { cn } from '@/lib/utils'
import { resolveDataVenueId } from '@/lib/venue-scope'

interface UpgradeContextValue {
  /** Open the drawer for the feature the user just tried to reach. */
  openUpgrade: (feature: FeatureKey) => void
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null)

/**
 * One drawer, opened from every lock in the product (doc §5.3). It is a Sheet,
 * not a route, so the user never loses their place.
 */
export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [feature, setFeature] = useState<FeatureKey | null>(null)
  const openUpgrade = useCallback((f: FeatureKey) => setFeature(f), [])

  return (
    <UpgradeContext.Provider value={{ openUpgrade }}>
      {children}
      {feature && <UpgradeDrawer feature={feature} onOpenChange={(open) => !open && setFeature(null)} />}
    </UpgradeContext.Provider>
  )
}

export function useUpgrade(): UpgradeContextValue {
  const ctx = useContext(UpgradeContext)
  if (!ctx) throw new Error('useUpgrade must be used within an <UpgradeProvider>')
  return ctx
}

function UpgradeDrawer({
  feature,
  onOpenChange,
}: {
  feature: FeatureKey | null
  onOpenChange: (open: boolean) => void
}) {
  const { config, setPlan } = useTenant()
  const navigate = useNavigate()
  const { start: startCheckout } = usePlanCheckout()
  const { appendForPlan } = useBillingInvoices()
  const [busy, setBusy] = useState(false)
  if (!feature) return null

  const meta = FEATURE_META[feature]
  const needed = planFor(feature)
  const current = PLAN_META[config.planId]
  const target = PLAN_META[needed]
  const delta =
    target.priceMonthly !== null && current.priceMonthly !== null
      ? target.priceMonthly - current.priceMonthly
      : null

  const runUpgrade = async () => {
    if (needed === 'enterprise') {
      toast.message('Enterprise is custom pricing', {
        description: 'Contact sales for multi-branch contracts.',
      })
      onOpenChange(false)
      navigate('/billing')
      return
    }
    if (needed === config.planId) {
      onOpenChange(false)
      return
    }
    setBusy(true)
    try {
      await startCheckout({
        restaurantId: resolveDataVenueId(),
        planId: needed,
        planName: target.name,
        onDemoApplied: (planId) => {
          setPlan(planId)
          appendForPlan(planId)
          toast.success(`Upgraded to ${PLAN_META[planId].name}`, {
            description: 'Applied in demo mode.',
          })
        },
        onActivated: (planId) => {
          setPlan(planId)
          appendForPlan(planId)
          toast.success(`Subscribed to ${PLAN_META[planId].name}`)
        },
      })
      onOpenChange(false)
    } catch (err) {
      if (err instanceof Error && err.message === 'Checkout closed') {
        toast.message('Checkout cancelled')
      } else {
        toast.error(err instanceof Error ? err.message : 'Checkout failed')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !busy && onOpenChange(open)}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="space-y-1 border-b border-line p-6 text-left">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-brand" />
            Unlock {meta.label}
          </SheetTitle>
          <SheetDescription>{meta.pitch}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <ul className="space-y-3">
            {meta.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-tint">
                  <Check className="h-3 w-3 text-brand" strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-3 gap-2">
            {PLAN_ORDER.map((planId) => {
              const isCurrent = planId === config.planId
              const isTarget = planId === needed
              return (
                <div
                  key={planId}
                  className={cn(
                    'rounded-card border-2 p-3 text-center',
                    isTarget
                      ? 'border-brand bg-brand-tint'
                      : isCurrent
                        ? 'border-line bg-surface-muted'
                        : 'border-line bg-surface',
                  )}
                >
                  <p className="text-xs font-semibold">{PLAN_META[planId].name}</p>
                  <p className="mt-1 text-sm font-bold tabular-nums">
                    {PLAN_META[planId].priceLabel}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {isCurrent ? 'Current' : isTarget ? 'Needed' : ' '}
                  </p>
                </div>
              )
            })}
          </div>

          {delta !== null && delta > 0 && (
            <p className="rounded-card bg-surface-muted p-3 text-sm">
              <span className="font-semibold tabular-nums">+{inr(delta)}/mo</span>{' '}
              <span className="text-muted-foreground">
                · billed monthly via secure checkout.
              </span>
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-line p-6">
          <Button className="h-11 w-full" disabled={busy} onClick={() => void runUpgrade()}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening checkout…
              </>
            ) : (
              <>
                Upgrade to {target.name}
                {target.priceMonthly !== null && ` — ${target.priceLabel}/mo`}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full"
            disabled={busy}
            onClick={() => {
              onOpenChange(false)
              navigate('/billing')
            }}
          >
            Compare all plans
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
