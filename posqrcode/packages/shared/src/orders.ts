import { z } from 'zod'

export const OrderStatusSchema = z.enum([
  'pending',
  'preparing',
  'ready',
  'served',
  'paid',
  'cancelled',
  'void',
])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const OrderTypeSchema = z.enum(['dine-in', 'takeaway', 'delivery'])
export type OrderType = z.infer<typeof OrderTypeSchema>

export const OrderLineSchema = z.object({
  /** Optional for guest carts / ad-hoc POS lines — stored on the order JSON. */
  menuItemId: z.string().optional().default(''),
  name: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  notes: z.string().optional(),
})
export type OrderLine = z.infer<typeof OrderLineSchema>

export const CreateOrderSchema = z.object({
  restaurantId: z.string().min(1),
  tableId: z.string().optional(),
  type: OrderTypeSchema.default('dine-in'),
  channel: z.string().default('qr'),
  lines: z.array(OrderLineSchema).min(1),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  paid: z.boolean().optional(),
  /** Delivery fee in INR (added to total, not taxed separately). */
  deliveryFee: z.number().nonnegative().optional(),
  /** Parcel / packing fee in INR. */
  parcelFee: z.number().nonnegative().optional(),
})
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
})
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>

/** Allowed transitions for the server status machine. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['preparing', 'cancelled', 'void'],
  preparing: ['ready', 'cancelled', 'void'],
  ready: ['served', 'paid', 'void'],
  served: ['paid', 'void'],
  paid: [],
  cancelled: [],
  void: [],
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false
}

export const OrderDtoSchema = z.object({
  id: z.string(),
  number: z.string(),
  restaurantId: z.string(),
  tableId: z.string().nullable(),
  type: OrderTypeSchema,
  channel: z.string(),
  status: OrderStatusSchema,
  lines: z.array(OrderLineSchema),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  guestName: z.string().nullable().optional(),
  guestPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  paid: z.boolean().optional(),
  razorpayOrderId: z.string().nullable().optional(),
  razorpayPaymentId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type OrderDto = z.infer<typeof OrderDtoSchema>
