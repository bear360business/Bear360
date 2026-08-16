import type { AuthRole } from '@bear360/shared'

export type JwtPayload = {
  sub: string
  role: AuthRole
  restaurantIds: string[]
  employeeId?: string
  staffName?: string
  email?: string | null
}
