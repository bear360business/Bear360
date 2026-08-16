import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { restaurantNav, type NavItem } from '@/components/app/AppSidebar'
import { useIndustryCopy, useIndustryProfile } from '@/hooks/use-industry-copy'
import { useNavConfig } from '@/hooks/use-nav-config'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { useTenant } from '@/hooks/use-tenant'
import { REQUIRED_NAV_PATHS, orderIndex } from '@/lib/nav-config'
import { PLAN_META, planFor } from '@/lib/tenant'
import { cn } from '@/lib/utils'

/**
 * Settings → Appearance → Side menu.
 * The owner decides which modules their team sees in the rail and in what
 * order. This is a preference, not an entitlement — it can only ever hide
 * something the plan already grants (doc §5.1, `tenantPref`).
 */
export function SideMenuControl() {
  const { config: platform } = usePlatformConfig()
  const { features } = useTenant()
  const industry = useIndustryProfile()
  const copy = useIndustryCopy()
  const { config, isHidden, setHidden, move, reset } = useNavConfig()
  const industryHidden = new Set(industry.navHints.hide)

  // Platform / industry packs remove an item entirely — it isn't the owner's to
  // control, so it doesn't appear in this list at all.
  const sections = restaurantNav
    .map((section) => ({
      ...section,
      items: section.items
        .filter(
          (item) =>
            !industryHidden.has(item.to) &&
            !(item.feature != null && industry.featureDefaults[item.feature] === false) &&
            (item.to !== '/kitchen' || platform.service.kitchenDisplay) &&
            (item.to !== '/reports' || platform.adminUi.showReports),
        )
        .map((item) => {
          if (item.to === '/tables') return { ...item, label: copy.spaces }
          if (item.to === '/menu') return { ...item, label: copy.catalog }
          return item
        })
        .sort((a, b) => orderIndex(config, a.to) - orderIndex(config, b.to)),
    }))
    .filter((section) => section.items.length > 0)

  const visibleCount = sections.flatMap((s) => s.items).filter((i) => !isHidden(i.to)).length
  const totalCount = sections.flatMap((s) => s.items).length

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Side menu</h3>
          <p className="mt-1 max-w-[52ch] text-xs text-muted-foreground">
            Choose which modules your team sees in the navigation, and the order they appear in.
            Hiding a module doesn't delete anything — you can turn it back on any time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
            {visibleCount} of {totalCount} shown
          </span>
          {/* Distinct from the Appearance card's theme Reset directly above. */}
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset menu
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {section.label}
            </p>
            <ul className="divide-y divide-line rounded-card border border-line">
              {section.items.map((item, index) => (
                <MenuRow
                  key={item.to}
                  item={item}
                  hidden={isHidden(item.to)}
                  required={REQUIRED_NAV_PATHS.includes(item.to)}
                  locked={item.feature != null && !features[item.feature]}
                  first={index === 0}
                  last={index === section.items.length - 1}
                  onToggle={(v) => setHidden(item.to, !v)}
                  onMove={(dir) => move(sections, item.to, dir)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}

function MenuRow({
  item,
  hidden,
  required,
  locked,
  first,
  last,
  onToggle,
  onMove,
}: {
  item: NavItem
  hidden: boolean
  required: boolean
  locked: boolean
  first: boolean
  last: boolean
  onToggle: (visible: boolean) => void
  onMove: (direction: -1 | 1) => void
}) {
  return (
    <li className={cn('flex items-center gap-3 px-3 py-2.5', hidden && 'bg-surface-muted/40')}>
      {/* Reorder — within this section only */}
      <span className="flex flex-col">
        <button
          type="button"
          disabled={first}
          onClick={() => onMove(-1)}
          aria-label={`Move ${item.label} up`}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={last}
          onClick={() => onMove(1)}
          aria-label={`Move ${item.label} down`}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </span>

      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          hidden ? 'bg-surface-muted text-muted-foreground' : 'bg-brand-tint text-brand',
        )}
      >
        <item.icon className="h-4 w-4" strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm font-medium', hidden && 'text-muted-foreground')}>
          {item.label}
        </span>
        <span className="block text-xs text-muted-foreground">
          {required
            ? 'Always shown'
            : locked
              ? `Locked — needs ${PLAN_META[planFor(item.feature!)].name}`
              : hidden
                ? 'Hidden from the menu'
                : item.to}
        </span>
      </span>

      {locked && !hidden && (
        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
      {hidden ? (
        <EyeOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <Eye className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <Switch
        checked={!hidden}
        disabled={required}
        onCheckedChange={onToggle}
        aria-label={`Show ${item.label} in the menu`}
      />
    </li>
  )
}
