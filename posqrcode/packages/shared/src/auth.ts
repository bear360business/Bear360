import { z } from 'zod'

export const AuthRoleSchema = z.enum(['super', 'restaurant', 'kitchen', 'staff'])
export type AuthRole = z.infer<typeof AuthRoleSchema>

export const LoginPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  expectedRole: AuthRoleSchema.optional(),
})
export type LoginPasswordInput = z.infer<typeof LoginPasswordSchema>

export const LoginStaffPinSchema = z.object({
  restaurantId: z.string().min(1),
  phone: z.string().min(8),
  pin: z.string().regex(/^\d{4,6}$/),
})
export type LoginStaffPinInput = z.infer<typeof LoginStaffPinSchema>

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
})
export type AuthTokens = z.infer<typeof AuthTokensSchema>

export const PosStaffPermissionsSchema = z.object({
  posTerminal: z.boolean(),
  orders: z.boolean(),
  menu: z.boolean(),
  expenses: z.boolean(),
})
export type PosStaffPermissions = z.infer<typeof PosStaffPermissionsSchema>

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  role: AuthRoleSchema,
  restaurantIds: z.array(z.string()).default([]),
  employeeId: z.string().optional(),
  staffName: z.string().optional(),
  posPermissions: PosStaffPermissionsSchema.optional(),
})
export type AuthUser = z.infer<typeof AuthUserSchema>

export const AuthSessionResponseSchema = z.object({
  user: AuthUserSchema,
  tokens: AuthTokensSchema,
})
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>

export const OtpPurposeSchema = z.enum(['signup', 'forgot'])
export type OtpPurpose = z.infer<typeof OtpPurposeSchema>

export const RequestOtpSchema = z.object({
  email: z.string().email(),
  purpose: OtpPurposeSchema,
})
export type RequestOtpInput = z.infer<typeof RequestOtpSchema>

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  purpose: OtpPurposeSchema,
  code: z.string().regex(/^\d{4,6}$/),
})
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  verificationToken: z.string().min(16),
})
export type RegisterInput = z.infer<typeof RegisterSchema>

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  verificationToken: z.string().min(16),
})
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
