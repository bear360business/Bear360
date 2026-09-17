import { z } from 'zod'
import { PlanIdSchema } from './entitlements'

export const CreateRestaurantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ownerName: z.string().min(1),
  ownerEmail: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  mapsLink: z.string().optional(),
  whatsapp: z.string().optional(),
  country: z.string().optional(),
  cuisine: z.string().optional(),
  industryId: z.string().default('restaurants'),
  planId: PlanIdSchema.default('basic'),
  gstin: z.string().optional(),
  gstRatePct: z.number().optional(),
  currency: z.string().optional(),
  emoji: z.string().optional(),
  logoImage: z.string().optional(),
  coverImage: z.string().optional(),
  /** Super-admin: create + provision owner account. */
  provisionOwnerEmail: z.string().email().optional(),
  provisionOwnerPassword: z.string().min(8).optional(),
})
export type CreateRestaurantInput = z.infer<typeof CreateRestaurantSchema>

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial().extend({
  status: z.enum(['active', 'trial', 'past_due', 'suspended', 'cancelled']).optional(),
  isOpen: z.boolean().optional(),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
})
export type UpdateRestaurantInput = z.infer<typeof UpdateRestaurantSchema>

export const MenuCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  emoji: z.string().default('🍽️'),
  sortOrder: z.number().int().default(0),
})
export type MenuCategoryInput = z.infer<typeof MenuCategorySchema>

export const MenuItemUpsertSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  veg: z.boolean().optional(),
  spicy: z.boolean().optional(),
  available: z.boolean().optional(),
  popular: z.boolean().optional(),
  image: z.string().optional(),
})
export type MenuItemUpsertInput = z.infer<typeof MenuItemUpsertSchema>

export const DiningTableSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  number: z.coerce.number().int().positive().optional(),
  seats: z.coerce.number().int().positive().default(4),
  status: z.enum(['free', 'occupied', 'reserved']).default('free'),
  zone: z.string().default('Main'),
  activeOrderId: z.string().nullable().optional(),
})
export type DiningTableInput = z.infer<typeof DiningTableSchema>

export const EmployeeUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(4),
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().email().optional().nullable(),
  ),
  pin: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().regex(/^\d{4,6}$/).optional(),
  ),
  roleId: z.string().default('waiter'),
  status: z.string().default('active'),
  hourlyRate: z.coerce.number().nonnegative().optional(),
  posAccess: z.boolean().optional(),
  posPermissions: z
    .object({
      posTerminal: z.boolean().optional(),
      orders: z.boolean().optional(),
      menu: z.boolean().optional(),
      expenses: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
  active: z.boolean().optional(),
})
export type EmployeeUpsertInput = z.infer<typeof EmployeeUpsertSchema>

export const IngredientUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.string().optional(),
  unit: z.string().optional(),
  stock: z.number().optional(),
  reorder: z.number().optional(),
  costPerUnit: z.number().optional(),
  supplier: z.string().optional(),
  dailyUse: z.number().optional(),
})
export type IngredientUpsertInput = z.infer<typeof IngredientUpsertSchema>

export const PurchaseCreateSchema = z.object({
  supplier: z.string().min(1),
  invoiceNo: z.string().optional(),
  date: z.string().min(1),
  lines: z
    .array(
      z.object({
        ingredientId: z.string(),
        qty: z.number().positive(),
        unitCost: z.number().nonnegative(),
      }),
    )
    .min(1),
  gstPct: z.number().optional(),
  note: z.string().optional(),
})
export type PurchaseCreateInput = z.infer<typeof PurchaseCreateSchema>

export const PosUnlockSchema = z.object({
  /** Last 10 digits of the staff mobile number. */
  phone: z.string().min(4),
  /** 4-6 digit numeric PIN set by admin in Staff → POS Staff. */
  pin: z.string().regex(/^\d{4,6}$/),
})
export type PosUnlockInput = z.infer<typeof PosUnlockSchema>
