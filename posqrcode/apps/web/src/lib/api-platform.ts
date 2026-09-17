import { apiRequest } from '@/lib/api-client'

let platformConfigCache: { promise: Promise<Record<string, unknown>>; timestamp: number } | null = null

export function apiGetPlatformConfig(): Promise<Record<string, unknown>> {
  const now = Date.now()
  if (platformConfigCache && now - platformConfigCache.timestamp < 3000) {
    return platformConfigCache.promise
  }

  const promise = apiRequest<Record<string, unknown>>('/platform/config').catch((err) => {
    platformConfigCache = null
    throw err
  })

  platformConfigCache = { promise, timestamp: now }
  return promise
}

export function apiPutPlatformConfig(patch: Record<string, unknown>) {
  platformConfigCache = null
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

let publicUiCache: { promise: Promise<any>; timestamp: number } | null = null

export function apiGetPublicPlatformUi() {
  const now = Date.now()
  if (publicUiCache && now - publicUiCache.timestamp < 3000) {
    return publicUiCache.promise
  }
  const promise = apiRequest<{
    service: Record<string, boolean>
    customerUi: Record<string, boolean>
    adminUi: Record<string, boolean>
    plans?: Array<{
      id: string
      name: string
      priceMonthly: number | null
      priceLabel: string
      tagline?: string
      features?: string[]
      popular?: boolean
      dark?: boolean
      archived?: boolean
    }>
  }>('/public/platform-ui', { auth: false }).catch((err) => {
    publicUiCache = null
    throw err
  })
  publicUiCache = { promise, timestamp: now }
  return promise
}
