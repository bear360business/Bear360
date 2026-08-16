import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MOCK_DELAY_MS } from '@/lib/mock'

export type PageState = 'loading' | 'ready' | 'empty' | 'error'

/**
 * Demo state driver (README): `?state=loading|empty|error` forces a state;
 * otherwise a ~600ms skeleton pass, then ready.
 */
export function usePageState(): PageState {
  const [params] = useSearchParams()
  const forced = params.get('state')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), MOCK_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  if (forced === 'loading' || forced === 'empty' || forced === 'error') return forced
  return ready ? 'ready' : 'loading'
}
