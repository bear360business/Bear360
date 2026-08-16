import { Navigate, Outlet } from 'react-router-dom'
import { FeatureGate } from '@/components/app/FeatureGate'
import { RequireAuth } from '@/components/app/RequireAuth'
import { isStoreSetupPending } from '@/features/admin/onboarding/store-setup'

/** Full-screen shell for the kitchen display — no sidebar/header (doc §6.12). */
export function KitchenLayout() {
  if (isStoreSetupPending()) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <RequireAuth role={['kitchen', 'restaurant']}>
      <FeatureGate feature="kitchen">
        <div className="min-h-screen bg-surface-page">
          <Outlet />
        </div>
      </FeatureGate>
    </RequireAuth>
  )
}
