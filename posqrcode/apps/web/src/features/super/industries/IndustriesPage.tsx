import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
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
import { useIndustries } from '@/hooks/use-industries'
import { INDUSTRY_ICONS, type IndustryId, type IndustryProfile } from '@/lib/industries'
import { ORDER_TYPE_META } from '@/lib/service-config'
import { FEATURE_KEYS } from '@/lib/plans-catalog'
import { FEATURE_META, type FeatureKey } from '@/lib/tenant'
import { cn } from '@/lib/utils'

const NAV_HIDE_OPTIONS = [
  { path: '/tables', label: 'Tables / spaces' },
  { path: '/kitchen', label: 'Kitchen' },
  { path: '/pos', label: 'POS' },
  { path: '/inventory', label: 'Inventory' },
] as const

/** Super Admin industry master — packs drive features, labels, service defaults. */
export function IndustriesPage() {
  const { profiles, update, reset } = useIndustries()
  const [editor, setEditor] = useState<IndustryProfile | null>(null)

  const saveEditor = (draft: IndustryProfile) => {
    if (!draft.name.trim()) {
      toast.error('Industry name is required')
      return
    }
    update(draft.id, draft)
    toast.success(`${draft.name} updated`, {
      description: 'Pack applies live to venues on this industry.',
    })
    setEditor(null)
  }

  return (
    <>
      <PageHeader
        title="Industries"
        caption="Platform packs — features, labels, and service defaults per vertical"
        actions={
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              reset()
              toast.success('Industries reset to defaults')
            }}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => {
          const Icon = INDUSTRY_ICONS[profile.id]
          const blocked = FEATURE_KEYS.filter((k) => profile.featureDefaults[k] === false).length
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setEditor(structuredClone(profile))}
              className="flex flex-col rounded-card border border-line bg-surface p-5 text-left shadow-card transition-shadow hover:shadow-raised"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-tint text-info">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-base font-semibold text-foreground">{profile.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{profile.caption}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Labels: {profile.labels.spaces} · {profile.labels.catalog}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {blocked === 0 ? 'All core modules allowed' : `${blocked} module(s) blocked`}
                {profile.navHints.hide.length > 0 &&
                  ` · hides ${profile.navHints.hide.join(', ')}`}
              </p>
              <span className="mt-4 text-sm font-semibold text-ink-900">Edit pack →</span>
            </button>
          )
        })}
      </div>

      <IndustryEditorDialog
        open={editor != null}
        profile={editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
        onSave={saveEditor}
      />
    </>
  )
}

function IndustryEditorDialog({
  open,
  profile,
  onOpenChange,
  onSave,
}: {
  open: boolean
  profile: IndustryProfile | null
  onOpenChange: (open: boolean) => void
  onSave: (profile: IndustryProfile) => void
}) {
  const [draft, setDraft] = useState<IndustryProfile | null>(null)

  useEffect(() => {
    if (open && profile) setDraft(structuredClone(profile))
  }, [open, profile])

  if (!draft) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" />
      </Dialog>
    )
  }

  const setFeature = (key: FeatureKey, allowed: boolean) => {
    setDraft((prev) => {
      if (!prev) return prev
      const featureDefaults = { ...prev.featureDefaults }
      if (allowed) delete featureDefaults[key]
      else featureDefaults[key] = false
      return { ...prev, featureDefaults }
    })
  }

  const toggleNavHide = (path: string, hide: boolean) => {
    setDraft((prev) => {
      if (!prev) return prev
      const set = new Set(prev.navHints.hide)
      if (hide) set.add(path)
      else set.delete(path)
      return { ...prev, navHints: { hide: [...set] } }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-line px-6 py-4">
          <DialogTitle>Edit {draft.name}</DialogTitle>
          <DialogDescription>
            Industry packs shape modules and copy. Effective access is plan ∧ industry ∧ platform.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ind-name">Name</Label>
              <Input
                id="ind-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ind-caption">Caption</Label>
              <Input
                id="ind-caption"
                value={draft.caption}
                onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Labels</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Soft copy for nav and page titles.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['venue', 'Venue'],
                  ['space', 'Space (singular)'],
                  ['spaces', 'Spaces (plural)'],
                  ['catalog', 'Catalog'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`ind-label-${key}`}>{label}</Label>
                  <Input
                    id={`ind-label-${key}`}
                    value={draft.labels[key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        labels: { ...draft.labels, [key]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Service defaults</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Applied when a venue switches to this industry.
            </p>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {ORDER_TYPE_META.map((type) => (
                <li key={type.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="text-sm">{type.label}</span>
                  <Switch
                    checked={draft.serviceDefaults.orderTypes[type.id]}
                    onCheckedChange={(on) =>
                      setDraft({
                        ...draft,
                        serviceDefaults: {
                          ...draft.serviceDefaults,
                          orderTypes: {
                            ...draft.serviceDefaults.orderTypes,
                            [type.id]: on,
                          },
                        },
                      })
                    }
                  />
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm">Counter QR ordering</span>
                <Switch
                  checked={draft.serviceDefaults.counterOrdering}
                  onCheckedChange={(on) =>
                    setDraft({
                      ...draft,
                      serviceDefaults: { ...draft.serviceDefaults, counterOrdering: on },
                    })
                  }
                />
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Module allow-list</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Off = industry blocks the module even if the plan grants it.
            </p>
            <ul className="mt-3 max-h-56 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {FEATURE_KEYS.map((key) => {
                const allowed = draft.featureDefaults[key] !== false
                return (
                  <li key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="text-sm">{FEATURE_META[key].label}</span>
                    <Switch checked={allowed} onCheckedChange={(on) => setFeature(key, on)} />
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Hide from nav</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Extra IA cleanup on top of module blocks.
            </p>
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {NAV_HIDE_OPTIONS.map((opt) => (
                <li key={opt.path} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="text-sm">{opt.label}</span>
                  <Switch
                    checked={draft.navHints.hide.includes(opt.path)}
                    onCheckedChange={(on) => toggleNavHide(opt.path, on)}
                  />
                </li>
              ))}
            </ul>
          </div>

          <p className={cn('text-xs text-muted-foreground')}>
            Industry id <code className="rounded bg-surface-muted px-1">{draft.id as IndustryId}</code>{' '}
            is fixed — venues store this key.
          </p>
        </div>

        <DialogFooter className="border-t border-line px-6 py-4">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-full font-semibold" onClick={() => onSave(draft)}>
            Save pack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
