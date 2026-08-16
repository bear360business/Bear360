import { useCallback, useEffect, useState } from 'react'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import { useMockData } from '@/lib/runtime-config'
import {
  readVenueScoped,
  resolveDataVenueId,
  subscribeVenueScope,
  writeVenueScoped,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

export const QR_DESIGN_KEY = 'bearqr:qr-design'

export type QrPattern = 'square' | 'dots'
export type QrCorner = 'sharp' | '5' | '10' | 'round'

export type QrDesign = {
  pattern: QrPattern
  fg: string
  bg: string
  corner: QrCorner
  logoUrl: string
  caption: string
}

const DEFAULT: QrDesign = {
  pattern: 'square',
  fg: '#0F172A',
  bg: '#FFFFFF',
  corner: 'sharp',
  logoUrl: '',
  caption: 'SCAN TO VIEW MENU',
}

function read(venueId = resolveDataVenueId()): QrDesign {
  return { ...DEFAULT, ...readVenueScoped<Partial<QrDesign>>(QR_DESIGN_KEY, venueId, {}) }
}

export function useQrDesign() {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [design, setDesign] = useState<QrDesign>(() => read())

  useEffect(() => {
    writeVenueScoped(QR_DESIGN_KEY, venueId, design)
  }, [design, venueId])

  useEffect(
    () =>
      subscribeVenueScope(() => {
        const next = resolveDataVenueId()
        setVenueId(next)
        setDesign(read(next))
      }),
    [],
  )

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void apiGetVenueData<QrDesign>(venueId, 'qrDesign')
      .then((remote) => {
        if (cancelled || !remote || typeof remote !== 'object') return
        const merged = { ...DEFAULT, ...remote }
        writeVenueScoped(QR_DESIGN_KEY, venueId, merged)
        setDesign(merged)
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  const patch = useCallback(
    (p: Partial<QrDesign>) => {
      setDesign((d) => {
        const next = { ...d, ...p }
        writeVenueScoped(QR_DESIGN_KEY, venueId, next)
        if (!mock && getAccessToken()) {
          void apiPutVenueData(venueId, 'qrDesign', next).catch((err) => reportApiError(err))
        }
        return next
      })
    },
    [mock, venueId],
  )

  return { design, patch }
}
