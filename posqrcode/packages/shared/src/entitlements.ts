import { z } from 'zod'

export const PlanIdSchema = z.enum(['basic', 'professional', 'enterprise'])
export type PlanId = z.infer<typeof PlanIdSchema>

export const FeatureKeySchema = z.enum([
  'tables',
  'qrOrdering',
  'pos',
  'kitchen',
  'inventory',
  'staff',
  'reports',
  'ai',
  'multiBranch',
])
export type FeatureKey = z.infer<typeof FeatureKeySchema>

export const EntitlementsSchema = z.object({
  restaurantId: z.string(),
  planId: PlanIdSchema,
  industryId: z.string(),
  features: z.record(FeatureKeySchema, z.boolean()),
  limits: z.object({
    tables: z.number().int().nonnegative(),
    menuItems: z.number().int().nonnegative(),
    staffSeats: z.number().int().nonnegative(),
    branches: z.number().int().nonnegative(),
  }),
  status: z.enum(['active', 'trial', 'past_due', 'suspended', 'cancelled']),
})
export type Entitlements = z.infer<typeof EntitlementsSchema>
