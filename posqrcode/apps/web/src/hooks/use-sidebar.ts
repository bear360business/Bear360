import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'bearqr:sidebar-collapsed'

export interface SidebarState {
  /** Desktop/tablet rail collapsed to 72px. */
  collapsed: boolean
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
  /** Mobile Sheet overlay open state. */
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

function readStored(): boolean | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === null ? null : raw === 'true'
  } catch {
    return null
  }
}

/**
 * Sidebar collapse state, persisted to localStorage.
 * Defaults to collapsed on tablet (<1280px) when nothing is stored (doc §4.2).
 */
export function useSidebar(): SidebarState {
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    const stored = readStored()
    if (stored !== null) return stored
    return typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 1279px)').matches
      : false
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // localStorage unavailable — collapse state just won't persist
    }
  }, [collapsed])

  const setCollapsed = useCallback((c: boolean) => setCollapsedState(c), [])
  const toggle = useCallback(() => setCollapsedState((c) => !c), [])

  return { collapsed, toggle, setCollapsed, mobileOpen, setMobileOpen }
}
