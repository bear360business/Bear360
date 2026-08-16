import { useEffect, useState } from 'react'
import { AUTH_EVENT } from '@/lib/auth'

/**
 * Bumps whenever auth session/tokens change so hydrate effects re-run after login
 * without requiring a full page refresh.
 */
export function useAuthTick(): number {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(AUTH_EVENT, bump)
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'bearqr:session' ||
        e.key === 'bearqr:api-access-token' ||
        e.key === null
      ) {
        bump()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(AUTH_EVENT, bump)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return tick
}
