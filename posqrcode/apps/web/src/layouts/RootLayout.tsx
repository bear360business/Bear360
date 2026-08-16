import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { UpgradeProvider } from '@/components/app/UpgradeDrawer'
import { notifyDataVenueChanged, resolveDataVenueId } from '@/lib/venue-scope'

/**
 * Pathless root route. Its only job is to host providers that need router
 * context (the upgrade drawer navigates), so every shell — super admin,
 * restaurant admin, staff, customer — has them available.
 */
export function RootLayout() {
  return (
    <UpgradeProvider>
      <DataVenueBridge />
      <Outlet />
    </UpgradeProvider>
  )
}

/** Keep scoped stores in sync with `/r/:id` vs admin current venue. */
function DataVenueBridge() {
  const { pathname } = useLocation()
  useEffect(() => {
    void resolveDataVenueId(pathname)
    notifyDataVenueChanged()
  }, [pathname])
  return null
}
