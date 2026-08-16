import { Navigate, Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/app/AppSidebar'
import { RequireAuth } from '@/components/app/RequireAuth'
import { TenantBanner } from '@/components/app/TenantBanner'
import { TopHeader } from '@/components/app/TopHeader'
import { TopNavBar } from '@/components/app/TopNavBar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { isStoreSetupPending } from '@/features/admin/onboarding/store-setup'
import { useAppearance } from '@/hooks/use-appearance'
import { useAuth } from '@/hooks/use-auth'
import { useIsMobile } from '@/hooks/use-media-query'
import { useSidebar } from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'

/**
 * Collapsible 264↔72px sidebar + TopHeader + content (doc §4.2).
 * Nav layout is admin-selectable (Settings → Appearance): classic rail,
 * floating rail, or Uber-style top bar. Mobile always uses the Sheet.
 * Owner and staff (PIN) share this shell; staff see a filtered menu.
 */
export function RestaurantAdminLayout() {
  const { session } = useAuth()
  const isStaff = session?.role === 'staff'
  const isMobile = useIsMobile()
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar()
  const layout = useAppearance().appearance.navLayout

  // New owner accounts must finish Create Your Profile before using the dashboard.
  // Staff PIN sessions never enter onboarding.
  if (!isStaff && isStoreSetupPending()) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <RequireAuth role={['restaurant', 'staff']}>
      <RestaurantAdminShell
        isMobile={isMobile}
        collapsed={collapsed}
        toggle={toggle}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        layout={layout}
        isStaff={isStaff}
      />
    </RequireAuth>
  )
}

function RestaurantAdminShell({
  isMobile,
  collapsed,
  toggle,
  mobileOpen,
  setMobileOpen,
  layout,
  isStaff,
}: {
  isMobile: boolean
  collapsed: boolean
  toggle: () => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  layout: ReturnType<typeof useAppearance>['appearance']['navLayout']
  isStaff: boolean
}) {
  // Staff stay on a simple rail — no owner top-bar / floating layouts.
  const effectiveLayout = isStaff ? 'classic' : layout
  const showRail = !isMobile && effectiveLayout !== 'topbar'
  const floating = !isStaff && effectiveLayout === 'floating'
  const contentPad = !showRail
    ? undefined
    : floating
      ? collapsed
        ? 'pl-[104px]'
        : 'pl-[296px]'
      : collapsed
        ? 'pl-[72px]'
        : 'pl-[264px]'

  return (
    <div className="min-h-screen bg-surface-page">
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] border-0 p-0">
            <AppSidebar variant="restaurant" onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {showRail && (
        <aside
          className={cn(
            'fixed z-40 bg-nav transition-[width,background-color] duration-300 ease-out',
            floating
              ? 'bottom-4 left-4 top-4 overflow-hidden rounded-2xl border border-nav-border shadow-float'
              : 'inset-y-0 left-0',
            collapsed ? 'w-[72px]' : 'w-[264px]',
          )}
        >
          <AppSidebar variant="restaurant" collapsed={collapsed} />
        </aside>
      )}

      <div className={cn(showRail && 'transition-[padding] duration-200 ease-out', contentPad)}>
        <div
          className={cn(
            'sticky top-0 z-30',
            floating &&
              !isMobile &&
              'bg-surface-page/85 px-4 pb-2 pt-4 backdrop-blur-md md:px-6 xl:px-8',
          )}
        >
          {!isMobile && effectiveLayout === 'topbar' && <TopNavBar variant="restaurant" />}
          <TopHeader
            portal="restaurant"
            onMenuClick={isMobile ? () => setMobileOpen(true) : undefined}
            onToggleCollapse={showRail ? toggle : undefined}
            floating={floating && !isMobile}
          />
        </div>
        <main className="mx-auto max-w-content p-4 md:p-6 xl:p-8">
          {!isStaff && <TenantBanner />}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
