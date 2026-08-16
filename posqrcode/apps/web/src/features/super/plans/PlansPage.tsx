import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Archive, Check, Plus, RotateCcw } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { LoadingSkeleton } from '@/components/app/LoadingSkeleton'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { usePageState } from '@/hooks/use-page-state'
import { usePlans } from '@/hooks/use-plans'
import { useRestaurants } from '@/hooks/use-restaurants'
import {
  FEATURE_KEYS,
  LIMIT_KEYS,
  blankPlanDraft,
  type ManagedPlan,
} from '@/lib/plans-catalog'
import { FEATURE_META, LIMIT_META, PLAN_ORDER } from '@/lib/tenant'
import { cn } from '@/lib/utils'

type EditorMode = 'create' | 'edit'

/** Plan tier cards + feature matrix editor + archive (doc §6.5 / S8). */
export function PlansPage() {
  const state = usePageState()
  const { activePlans, archivedPlans, create, update, archive, restore, reset } = usePlans()
  const { restaurants } = useRestaurants()
  const liveCount = (planId: string) =>
    restaurants.filter((r) => r.planId === planId).length
  const [editor, setEditor] = useState<{ mode: EditorMode; plan: ManagedPlan } | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ManagedPlan | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const openCreate = () => setEditor({ mode: 'create', plan: blankPlanDraft() })
  const openEdit = (plan: ManagedPlan) =>
    setEditor({ mode: 'edit', plan: structuredClone(plan) })

  const saveEditor = (draft: ManagedPlan) => {
    if (!draft.name.trim()) {
      toast.error('Plan name is required')
      return
    }
    if (editor?.mode === 'create') {
      create(draft)
      toast.success(`${draft.name} created`, {
        description: 'Available for new restaurant sign-ups.',
      })
    } else {
      update(draft.id, draft)
      toast.success(`${draft.name} updated`, {
        description: 'Feature grants and limits apply live across the demo.',
      })
    }
    setEditor(null)
  }

  return (
    <>
      <PageHeader
        title="Plans"
        caption="Manage subscription tiers, features and limits"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                reset()
                toast.success('Plans reset to defaults')
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
            </Button>
            <Button className="rounded-full font-semibold" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" /> New plan
            </Button>
          </div>
        }
      />

      {state === 'loading' ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <LoadingSkeleton variant="card" count={3} />
        </div>
      ) : activePlans.length === 0 ? (
        <div className="rounded-card border border-line bg-surface shadow-card">
          <EmptyState
            icon={Archive}
            title="No active plans"
            description="Restore an archived tier or create a new plan for sign-ups."
            action={
              <Button className="rounded-full font-semibold" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> New plan
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              venueCount={liveCount(plan.id)}
              onEdit={() => openEdit(plan)}
              onArchive={() => setArchiveTarget(plan)}
            />
          ))}
        </div>
      )}

      {archivedPlans.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            className="mb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? 'Hide' : 'Show'} archived ({archivedPlans.length})
          </button>
          {showArchived && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {archivedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-col rounded-card border border-dashed border-line bg-surface-muted/40 p-5 opacity-80"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {plan.name}
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold">{plan.priceLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {liveCount(plan.id)} restaurants still on this plan
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 rounded-full"
                    onClick={() => {
                      restore(plan.id)
                      toast.success(`${plan.name} restored`)
                    }}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <PlanEditorDialog
        open={editor !== null}
        mode={editor?.mode ?? 'edit'}
        plan={editor?.plan ?? null}
        onOpenChange={(open) => !open && setEditor(null)}
        onSave={saveEditor}
      />

      <Dialog open={archiveTarget !== null} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Archive {archiveTarget?.name}?</DialogTitle>
            <DialogDescription>
              {archiveTarget ? liveCount(archiveTarget.id) : 0} restaurants are on this plan. They keep their
              subscription, but new sign-ups can&apos;t choose it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => {
                if (archiveTarget) {
                  archive(archiveTarget.id)
                  toast.success(`${archiveTarget.name} archived`)
                }
                setArchiveTarget(null)
              }}
            >
              Archive plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PlanCard({
  plan,
  venueCount,
  onEdit,
  onArchive,
}: {
  plan: ManagedPlan
  venueCount: number
  onEdit: () => void
  onArchive: () => void
}) {
  const grantCount = FEATURE_KEYS.filter((k) => plan.featureGrants[k]).length
  return (
    <div
      className={cn(
        'flex flex-col rounded-card border p-6 shadow-card',
        plan.dark ? 'border-ink-800 bg-ink-800 text-white' : 'border-line bg-surface',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-xs font-semibold uppercase tracking-[0.16em]',
            plan.dark ? 'text-white/60' : 'text-muted-foreground',
          )}
        >
          {plan.name}
        </p>
        {plan.popular && (
          <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-brand-foreground">
            Popular
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-4xl font-bold">
        {plan.priceLabel}
        {plan.priceMonthly !== null && (
          <span
            className={cn(
              'text-base font-normal',
              plan.dark ? 'text-white/60' : 'text-muted-foreground',
            )}
          >
            {' '}
            /mo
          </span>
        )}
      </p>
      {plan.tagline && (
        <p className={cn('mt-1 text-sm', plan.dark ? 'text-white/70' : 'text-muted-foreground')}>
          {plan.tagline}
        </p>
      )}
      <ul className="mt-5 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 shrink-0 text-success" /> {f}
          </li>
        ))}
      </ul>
      <p className={cn('mt-5 text-xs', plan.dark ? 'text-white/60' : 'text-muted-foreground')}>
        {grantCount} features enabled · {venueCount} restaurants
      </p>
      <div className="mt-6 flex gap-2 pt-2">
        <Button
          variant={plan.dark ? 'secondary' : 'outline'}
          className="flex-1 rounded-full"
          onClick={onEdit}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          className={cn('flex-1 rounded-full', plan.dark && 'text-white hover:bg-white/10 hover:text-white')}
          onClick={onArchive}
        >
          Archive
        </Button>
      </div>
    </div>
  )
}

function PlanEditorDialog({
  open,
  mode,
  plan,
  onOpenChange,
  onSave,
}: {
  open: boolean
  mode: EditorMode
  plan: ManagedPlan | null
  onOpenChange: (open: boolean) => void
  onSave: (plan: ManagedPlan) => void
}) {
  const [draft, setDraft] = useState<ManagedPlan | null>(null)

  useEffect(() => {
    if (open && plan) setDraft(structuredClone(plan))
  }, [open, plan])

  const bullets = useMemo(() => (draft?.features ?? []).join('\n'), [draft?.features])
  const isCanonical = draft ? (PLAN_ORDER as string[]).includes(draft.id) : false

  if (!draft) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" />
      </Dialog>
    )
  }

  const set = <K extends keyof ManagedPlan>(key: K, value: ManagedPlan[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))

  const customPrice = draft.priceMonthly === null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-line px-6 py-4">
          <DialogTitle>{mode === 'create' ? 'New plan' : `Edit ${draft.name}`}</DialogTitle>
          <DialogDescription>
            Set pricing, marketing bullets, feature grants and usage limits. Changes persist in this
            browser for the demo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plan-tagline">Tagline</Label>
              <Input
                id="plan-tagline"
                value={draft.tagline ?? ''}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="Full-service restaurant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-price">Monthly price (₹)</Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                disabled={customPrice}
                value={customPrice ? '' : draft.priceMonthly ?? ''}
                placeholder="Custom"
                onChange={(e) => {
                  const n = Number(e.target.value)
                  set('priceMonthly', e.target.value === '' ? 0 : n)
                }}
              />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={customPrice}
                  onCheckedChange={(on) => set('priceMonthly', on ? null : 2499)}
                />
                Custom price
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={Boolean(draft.popular)} onCheckedChange={(v) => set('popular', v)} />
              Popular badge
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={Boolean(draft.dark)} onCheckedChange={(v) => set('dark', v)} />
              Dark card
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-bullets">Card bullets (one per line)</Label>
            <Textarea
              id="plan-bullets"
              rows={3}
              value={bullets}
              onChange={(e) =>
                set(
                  'features',
                  e.target.value
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold">Feature grants</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Controls what restaurants on this plan can unlock
              {isCanonical ? ' — live for tenant gating' : ' (custom tiers are catalogue-only)'}.
            </p>
            <ul className="max-h-48 space-y-0.5 overflow-y-auto rounded-xl border border-line p-1">
              {FEATURE_KEYS.map((key) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 hover:bg-surface-muted/60"
                >
                  <span className="text-sm">{FEATURE_META[key].label}</span>
                  <Switch
                    checked={Boolean(draft.featureGrants[key])}
                    onCheckedChange={(on) =>
                      set('featureGrants', { ...draft.featureGrants, [key]: on })
                    }
                    aria-label={FEATURE_META[key].label}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Usage limits</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Leave empty for unlimited.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {LIMIT_KEYS.map((key) => {
                const val = draft.limits[key]
                return (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`limit-${key}`}>{LIMIT_META[key].label}</Label>
                    <Input
                      id={`limit-${key}`}
                      type="number"
                      min={0}
                      placeholder="Unlimited"
                      value={val === null ? '' : val}
                      onChange={(e) => {
                        const raw = e.target.value
                        set('limits', {
                          ...draft.limits,
                          [key]: raw === '' ? null : Math.max(0, Number(raw) || 0),
                        })
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-line px-6 py-4">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-full font-semibold" onClick={() => onSave(draft)}>
            {mode === 'create' ? 'Create plan' : 'Save plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
