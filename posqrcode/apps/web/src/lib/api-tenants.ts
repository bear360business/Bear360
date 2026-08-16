import type { CreateRestaurantInput, UpdateRestaurantInput } from '@bear360/shared'
import { apiRequest } from '@/lib/api-client'
import type { PlanId, TenantStatus } from '@/lib/tenant'

export type ApiRestaurant = {
  id: string
  slug: string
  name: string
  phone: string
  address: string | null
  city: string
  country?: string
  cuisine?: string
  ownerName?: string
  ownerEmail?: string
  whatsapp?: string | null
  mapsLink?: string | null
  planId: PlanId
  industryId: string
  status: TenantStatus | string
  gstRatePct: string | number
  gstin?: string | null
  currency?: string
  emoji?: string
  logoImage?: string | null
  coverImage?: string | null
  isOpen?: boolean
  opensAt?: string | null
  closesAt?: string | null
  settings?: Record<string, unknown>
}

export function apiListTenants() {
  return apiRequest<ApiRestaurant[]>('/tenants')
}

export function apiGetTenant(restaurantId: string) {
  return apiRequest<ApiRestaurant>(`/tenants/${restaurantId}`)
}

export function apiCreateTenant(input: CreateRestaurantInput) {
  return apiRequest<ApiRestaurant>('/tenants', { body: input })
}

export function apiUpdateTenant(restaurantId: string, input: UpdateRestaurantInput) {
  return apiRequest<ApiRestaurant>(`/tenants/${restaurantId}`, {
    method: 'PATCH',
    body: input,
  })
}

export function apiDeleteTenant(restaurantId: string) {
  return apiRequest<{ ok: true; id: string }>(`/tenants/${restaurantId}`, {
    method: 'DELETE',
  })
}
