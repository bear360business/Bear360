import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api-client'
import { isStoreSetupPending } from '@/features/admin/onboarding/store-setup'

/** Surface API failures so optimistic UI does not hide server errors. */
export function reportApiError(err: unknown, fallback = 'Could not save — try again') {
  if (err instanceof ApiClientError) {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    const isCustomerRoute = pathname.startsWith('/r/')
    const isMarketingRoute =
      pathname === '/' || pathname === '/contact' || pathname === '/portals' || pathname === '/qr-test'
    const shouldSilence = isStoreSetupPending() || isCustomerRoute || isMarketingRoute
    if (
      shouldSilence &&
      (err.status === 401 || err.status === 403 || err.code === 'TENANT_FORBIDDEN')
    ) {
      return
    }
  }

  const message =
    err instanceof ApiClientError
      ? err.message
      : err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : fallback
  toast.error(message || fallback)
}

/** Fire-and-forget API write with toast on failure. */
export function apiCatch(err: unknown, fallback?: string) {
  reportApiError(err, fallback)
}

