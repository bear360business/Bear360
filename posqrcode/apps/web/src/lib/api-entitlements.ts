import type { Entitlements } from '@bear360/shared'
import { apiRequest } from '@/lib/api-client'

export function apiGetEntitlements(restaurantId: string) {
  return apiRequest<Entitlements>(`/entitlements/${restaurantId}`)
}
