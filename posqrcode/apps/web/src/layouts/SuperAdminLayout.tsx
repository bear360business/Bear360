import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/app/AppSidebar'
import { RequireAuth } from '@/components/app/RequireAuth'
import { TopHeader } from '@/components/app/TopHeader'
import { TopNavBar } from '@/components/app/TopNavBar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAppearance } from '@/hooks/use-appearance'
import { useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

/** Fixed 264px sidebar + TopHeader + content (doc §4.1); nav layout follows Appearance. */
export function SuperAdminLayout() {
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)
  const layout = useAppearance().appearance.navLayout

  const showRail = !isMobile && layout !== 'topbar'
  const floating = layout === 'floating'

  return (
    <RequireAuth role="super">
    <div className="min-h-screen bg-surface-page">
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[280px] border-0 p-0">
            <AppSidebar variant="super" onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {showRail && (
        <aside
          className={cn(
            'fixed z-40 w-[264px] bg-nav transition-colors duration-300',
            floating
              ? 'bottom-4 left-4 top-4 overflow-hidden rounded-2xl border border-nav-border shadow-float'
              : 'inset-y-0 left-0',
          )}
        >
          <AppSidebar variant="super" />
        </aside>
      )}

      <div className={cn(showRail && (floating ? 'pl-[296px]' : 'pl-[264px]'))}>
        <div
          className={cn(
            'sticky top-0 z-30',
            floating &&
              !isMobile &&
              'bg-surface-page/85 px-4 pb-2 pt-4 backdrop-blur-md md:px-6 xl:px-8',
          )}
        >
          {!isMobile && layout === 'topbar' && <TopNavBar variant="super" />}
          <TopHeader
            portal="super"
            onMenuClick={isMobile ? () => setMobileOpen(true) : undefined}
            floating={floating && !isMobile}
          />
        </div>
        <main className="mx-auto max-w-content p-4 md:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
    </div>
    </RequireAuth>
  )
}
