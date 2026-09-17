import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getAccessToken } from '@/lib/api-client'
import { isSuperAdmin } from '@/lib/auth'
import {
  apiGetPlatformConfig,
  apiGetPublicPlatformUi,
  apiPutPlatformConfig,
} from '@/lib/api-platform'
import {
  PLANS_STORAGE_KEY,
  blankPlanDraft,
  defaultPlansCatalog,
  formatPriceLabel,
  mergePlansCatalog,
  syncPlansCatalog,
  toDisplayPlan,
  type ManagedPlan,
} from '@/lib/plans-catalog'
import { plans as mockPlans } from '@/lib/mock/plans'
import { useMockData } from '@/lib/runtime-config'
import { reportApiError } from '@/lib/api-error'

interface PlansContextValue {
  plans: ManagedPlan[]
  activePlans: ManagedPlan[]
  archivedPlans: ManagedPlan[]
  create: (draft?: Partial<ManagedPlan>) => ManagedPlan
  update: (id: string, patch: Partial<ManagedPlan>) => void
  archive: (id: string) => void
  restore: (id: string) => void
  remove: (id: string) => void
  reset: () => void
}

const PlansContext = createContext<PlansContextValue | null>(null)

function readStored(): ManagedPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY)
    return raw ? mergePlansCatalog(JSON.parse(raw)) : defaultPlansCatalog()
  } catch {
    return defaultPlansCatalog()
  }
}

function writeStored(plans: ManagedPlan[]) {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans))
  } catch {
    /* ignore */
  }
}

function syncLegacyMock(list: ManagedPlan[]) {
  syncPlansCatalog(list)
  const active = list.filter((p) => !p.archived).map(toDisplayPlan)
  mockPlans.splice(0, mockPlans.length, ...active)
}

export function PlansProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const apiReady = useRef(mock)
  const [plans, setPlans] = useState<ManagedPlan[]>(() => {
    const initial = readStored()
    syncLegacyMock(initial)
    return initial
  })

  useEffect(() => {
    writeStored(plans)
    syncLegacyMock(plans)
    if (!mock && apiReady.current && isSuperAdmin() && getAccessToken()) {
      void apiPutPlatformConfig({ plans }).catch((err) => reportApiError(err))
    }
  }, [plans, mock])

  useEffect(() => {
    if (mock) {
      apiReady.current = true
      return
    }
    let cancelled = false
    const loadPlans = async () => {
      try {
        if (isSuperAdmin() && getAccessToken()) {
          const cfg = await apiGetPlatformConfig()
          if (cancelled) return
          if (Array.isArray(cfg?.plans)) {
            const next = mergePlansCatalog(cfg.plans)
            syncLegacyMock(next)
            writeStored(next)
            setPlans(next)
            return
          }
        }
        const ui = await apiGetPublicPlatformUi()
        if (cancelled) return
        const plansData = (ui as Record<string, unknown>)?.plans
        if (Array.isArray(plansData)) {
          const next = mergePlansCatalog(plansData)
          syncLegacyMock(next)
          writeStored(next)
          setPlans(next)
        }
      } catch (err) {
        reportApiError(err)
      } finally {
        if (!cancelled) apiReady.current = true
      }
    }
    void loadPlans()
    return () => {
      cancelled = true
    }
  }, [mock])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PLANS_STORAGE_KEY || e.key === null) {
        const next = readStored()
        syncLegacyMock(next)
        setPlans(next)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const commit = useCallback((update: (prev: ManagedPlan[]) => ManagedPlan[]) => {
    setPlans((prev) => update(prev))
  }, [])

  const create = useCallback(
    (draft?: Partial<ManagedPlan>) => {
      const base = blankPlanDraft()
      const next: ManagedPlan = {
        ...base,
        ...draft,
        id: draft?.id ?? base.id,
        featureGrants: { ...base.featureGrants, ...draft?.featureGrants },
        limits: { ...base.limits, ...draft?.limits },
      }
      next.priceLabel = formatPriceLabel(next.priceMonthly)
      commit((prev) => [...prev, next])
      return next
    },
    [commit],
  )

  const update = useCallback(
    (id: string, patch: Partial<ManagedPlan>) => {
      commit((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p
          const merged = { ...p, ...patch }
          if ('priceMonthly' in patch) {
            merged.priceLabel = formatPriceLabel(merged.priceMonthly)
          }
          return merged
        }),
      )
    },
    [commit],
  )

  const archive = useCallback(
    (id: string) => {
      commit((prev) => prev.map((p) => (p.id === id ? { ...p, archived: true, popular: false } : p)))
    },
    [commit],
  )

  const restore = useCallback(
    (id: string) => {
      commit((prev) => prev.map((p) => (p.id === id ? { ...p, archived: false } : p)))
    },
    [commit],
  )

  const remove = useCallback(
    (id: string) => {
      commit((prev) => prev.filter((p) => p.id !== id))
    },
    [commit],
  )

  const reset = useCallback(() => {
    const next = defaultPlansCatalog()
    writeStored(next)
    syncLegacyMock(next)
    setPlans(next)
  }, [])

  const value = useMemo<PlansContextValue>(() => {
    const activePlans = plans.filter((p) => !p.archived)
    const archivedPlans = plans.filter((p) => p.archived)
    return {
      plans,
      activePlans,
      archivedPlans,
      create,
      update,
      archive,
      restore,
      remove,
      reset,
    }
  }, [plans, create, update, archive, restore, remove, reset])

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>
}

export function usePlans(): PlansContextValue {
  const ctx = useContext(PlansContext)
  if (!ctx) throw new Error('usePlans must be used within a <PlansProvider>')
  return ctx
}
