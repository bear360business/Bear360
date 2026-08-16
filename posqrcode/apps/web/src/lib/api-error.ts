import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api-client'

/** Surface API failures so optimistic UI does not hide server errors. */
export function reportApiError(err: unknown, fallback = 'Could not save — try again') {
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
