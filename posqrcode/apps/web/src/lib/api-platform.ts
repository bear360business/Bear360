import { apiRequest } from '@/lib/api-client'

export function apiGetPlatformConfig() {
  return apiRequest<Record<string, unknown>>('/platform/config')
}

export function apiPutPlatformConfig(patch: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/platform/config', {
    method: 'PUT',
    body: patch,
  })
}

export function apiGetVenueData<T>(restaurantId: string, bag: string) {
  return apiRequest<T>(`/restaurants/${restaurantId}/data/${bag}`)
}

export function apiPutVenueData<T>(restaurantId: string, bag: string, value: T) {
  return apiRequest<T>(`/restaurants/${restaurantId}/data/${bag}`, {
    method: 'PUT',
    body: value,
  })
}

export function apiSubmitLead(body: {
  name: string
  email: string
  phone?: string
  businessName?: string
  city?: string
  interest: string
  message: string
}) {
  return apiRequest('/public/leads', { auth: false, body })
}

export function apiGetPublicPlatformUi() {
  return apiRequest<{
    service: Record<string, boolean>
    customerUi: Record<string, boolean>
    adminUi: Record<string, boolean>
  }>('/public/platform-ui', { auth: false })
}
