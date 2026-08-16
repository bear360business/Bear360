import { useEffect, useState } from 'react'

/** Reactive `window.matchMedia` — e.g. useMediaQuery('(max-width: 767px)'). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** < 768px (doc §1.6 Mobile) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}

/** 768–1279px (doc §1.6 Tablet) */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1279px)')
}

/** ≥ 1280px (doc §1.6 Desktop) */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1280px)')
}
