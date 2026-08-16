import {
  defaultPlansCatalog,
  getCatalogPlanById,
  toDisplayPlan,
  type ManagedPlan,
} from '../plans-catalog'
import type { Plan, PlanId } from '../types'

/** Mutable list kept in sync by PlansProvider (active, non-archived only). */
export const plans: Plan[] = defaultPlansCatalog().map(toDisplayPlan)

export function getPlanById(id: PlanId | string): Plan {
  const managed = getCatalogPlanById(id)
  if (managed) return toDisplayPlan(managed)
  return plans.find((p) => p.id === id) ?? plans[0]
}

export type { ManagedPlan }
