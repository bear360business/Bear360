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

const venueDataCache = new Map<string, { promise: Promise<any>; timestamp: number }>()

export function apiGetVenueData<T>(restaurantId: string, bag: string): Promise<T> {
  const key = `${restaurantId}:${bag}`
  const now = Date.now()
  const cached = venueDataCache.get(key)
  if (cached && now - cached.timestamp < 3000) {
    return cached.promise as Promise<T>
  }

  const promise = apiRequest<T>(`/restaurants/${restaurantId}/data/${bag}`).catch((err) => {
    venueDataCache.delete(key)
    throw err
  })

  venueDataCache.set(key, { promise, timestamp: now })
  return promise
}

export function apiPutVenueData<T>(restaurantId: string, bag: string, value: T) {
  const key = `${restaurantId}:${bag}`
  venueDataCache.delete(key)
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
