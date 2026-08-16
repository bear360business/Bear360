import type { ReactNode } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PlanBadge } from '@/components/app/PlanBadge'
import { useUpgrade } from '@/components/app/UpgradeDrawer'
import { useAuth } from '@/hooks/use-auth'
import { useIndustryProfile } from '@/hooks/use-industry-copy'
import { useTenant } from '@/hooks/use-tenant'
import { FEATURE_META, PLAN_META, planFor, type FeatureKey } from '@/lib/tenant'
import { cn } from '@/lib/utils'

export interface FeatureGateProps {
  feature: FeatureKey
  /**
   * page   — route guard: renders a full upgrade page instead of the screen
   * inline — renders a locked preview card in place of a section
   */
  mode?: 'page' | 'inline'
  /** Optional blurred preview rendered behind the lock (inline mode). */
  preview?: ReactNode
  children: ReactNode
}

/**
 * Never 404 an unentitled route — render something that sells (doc §5.2).
 * A super-admin kill switch is different from a plan gate: the feature is
 * hidden upstream in the nav, so this component only ever explains plans.
 */
export function FeatureGate({ feature, mode = 'page', preview, children }: FeatureGateProps) {
  const { features } = useTenant()
  const industry = useIndustryProfile()
  const { session } = useAuth()
  if (features[feature]) return <>{children}</>
  // Industry pack off ≠ plan upsell — don't sell Pro for a cloud kitchen's Tables.
  if (industry.featureDefaults[feature] === false) {
    return mode === 'page' ? (
      <IndustryUnavailablePage feature={feature} industryName={industry.name} />
    ) : null
  }
  // Staff should not see owner upgrade CTAs — venue plan simply lacks the module.
  if (session?.role === 'staff' && mode === 'page') {
    return <StaffPlanBlockedPage feature={feature} />
  }
  return mode === 'page' ? (
    <UpgradePage feature={feature} preview={preview} />
  ) : (
    <LockedPreview feature={feature}>{preview}</LockedPreview>
  )
}

function StaffPlanBlockedPage({ feature }: { feature: FeatureKey }) {
  const meta = FEATURE_META[feature]
  return (
    <div className="mx-auto max-w-[560px] py-6">
      <div className="rounded-card border border-line bg-surface p-8 shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">{meta.label} isn’t on this venue’s plan</h1>
        <p className="mt-2 text-base leading-6 text-muted-foreground">
          Ask your manager or the restaurant owner to upgrade the subscription. Staff accounts can’t
          change billing.
        </p>
      </div>
    </div>
  )
}

function IndustryUnavailablePage({
  feature,
  industryName,
}: {
  feature: FeatureKey
  industryName: string
}) {
  const meta = FEATURE_META[feature]
  return (
    <div className="mx-auto max-w-[560px] py-6">
      <div className="rounded-card border border-line bg-surface p-8 shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">{meta.label} isn’t part of {industryName}</h1>
        <p className="mt-2 text-base leading-6 text-muted-foreground">
          Your industry pack hides this module. Change industry in Settings → Profile, or ask Super
          Admin to adjust the industry matrix.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/settings">Open Settings</Link>
        </Button>
      </div>
    </div>
  )
}

/** Full-page upgrade sell (doc §5.2 style B). */
export function UpgradePage({ feature, preview }: { feature: FeatureKey; preview?: ReactNode }) {
  const { config } = useTenant()
  const { openUpgrade } = useUpgrade()
  const meta = FEATURE_META[feature]
  const needed = planFor(feature)

  return (
    <div className="mx-auto max-w-[720px] py-6">
      <div className="rounded-card border border-line bg-surface p-8 shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint">
          <Sparkles className="h-6 w-6 text-brand" />
        </span>
        <h1 className="mt-4 flex flex-wrap items-center gap-3 font-display text-2xl font-bold">
          {meta.label} is a {PLAN_META[needed].name} feature
          <PlanBadge plan={needed} size="md" />
        </h1>
        <p className="mt-2 max-w-[52ch] text-base leading-6 text-muted-foreground">{meta.pitch}</p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {meta.benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 rounded-xl bg-surface-muted/60 p-3 text-sm"
            >
              <span aria-hidden className="text-brand">
                ✓
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        {preview && (
          <div className="relative mt-6 overflow-hidden rounded-card border border-line">
            <div aria-hidden className="pointer-events-none select-none blur-[3px] saturate-50">
              {preview}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-surface/10 to-surface" />
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button className="h-11" onClick={() => openUpgrade(feature)}>
            Upgrade to {PLAN_META[needed].name}
            {PLAN_META[needed].priceMonthly !== null && ` — ${PLAN_META[needed].priceLabel}/mo`}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          You're on {PLAN_META[config.planId].name}. Upgrades apply immediately; you're billed the
          prorated difference.
        </p>
      </div>
    </div>
  )
}

/** In-screen partial gate — the locked tab/section (doc §5.2 style C). */
export function LockedPreview({
  feature,
  children,
  className,
}: {
  feature: FeatureKey
  children?: ReactNode
  className?: string
}) {
  const { openUpgrade } = useUpgrade()
  const meta = FEATURE_META[feature]
  const needed = planFor(feature)

  return (
    <div className={cn('relative overflow-hidden rounded-card border border-line', className)}>
      {children && (
        <div aria-hidden className="pointer-events-none select-none blur-[3px] saturate-50">
          {children}
        </div>
      )}
      <div
        className={cn(
          'inset-0 flex flex-col items-center justify-center gap-3 bg-surface/80 p-8 text-center backdrop-blur-[2px]',
          children ? 'absolute' : 'relative',
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-sm font-semibold">{meta.label}</p>
          <p className="mt-0.5 max-w-[40ch] text-xs text-muted-foreground">{meta.pitch}</p>
        </div>
        <Button size="sm" onClick={() => openUpgrade(feature)}>
          Unlock with {PLAN_META[needed].name}
        </Button>
      </div>
    </div>
  )
}
