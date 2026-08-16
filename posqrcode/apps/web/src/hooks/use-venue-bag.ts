import { useCallback, useEffect, useState } from 'react'
import { getAccessToken } from '@/lib/api-client'
import { reportApiError } from '@/lib/api-error'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import { useMockData } from '@/lib/runtime-config'
import {
  resolveDataVenueId,
  subscribeVenueScope,
  venueKey,
} from '@/lib/venue-scope'
import { useAuthTick } from '@/hooks/use-auth-tick'

/** Dual-write hook: localStorage cache + venue data bag (or custom load/save). Never seeds empty API bags. */
export function useVenueBagState<T>(opts: {
  storageKey: string
  bag: string
  seed: T
  isEmpty?: (value: T) => boolean
  /** Override default `/data/:bag` endpoints (e.g. staff-ops). */
  load?: (venueId: string) => Promise<T>
  save?: (venueId: string, value: T) => Promise<T>
}) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [value, setValue] = useState<T>(() => {
    if (!mock) return opts.seed
    try {
      const raw = localStorage.getItem(venueKey(opts.storageKey, resolveDataVenueId()))
      if (raw) return JSON.parse(raw) as T
    } catch {
      /* ignore */
    }
    return opts.seed
  })
  const [hydrated, setHydrated] = useState(mock)

  useEffect(() => subscribeVenueScope(() => setVenueId(resolveDataVenueId())), [])

  const writeLocal = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(venueKey(opts.storageKey, venueId), JSON.stringify(next))
      } catch {
        /* ignore */
      }
    },
    [opts.storageKey, venueId],
  )

  useEffect(() => {
    if (!mock) {
      setValue(opts.seed)
      setHydrated(false)
      return
    }
    try {
      const raw = localStorage.getItem(venueKey(opts.storageKey, venueId))
      if (raw) setValue(JSON.parse(raw) as T)
      else setValue(opts.seed)
    } catch {
      setValue(opts.seed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed is stable per call site
  }, [venueId, opts.storageKey, mock])

  useEffect(() => {
    if (mock || !getAccessToken()) {
      setHydrated(true)
      return
    }
    let cancelled = false
    const load = opts.load ?? ((id: string) => apiGetVenueData<T>(id, opts.bag))
    void load(venueId)
      .then((remote) => {
        if (cancelled) return
        const empty =
          opts.isEmpty?.(remote) ??
          (Array.isArray(remote) ? remote.length === 0 : remote == null)
        if (empty) {
          // Keep empty — do not push fixture seed into the API.
          writeLocal(opts.seed)
          setValue(opts.seed)
        } else {
          writeLocal(remote)
          setValue(remote)
        }
        setHydrated(true)
      })
      .catch((err) => {
        if (!cancelled) {
          reportApiError(err, 'Could not load saved data')
          setHydrated(true)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock, venueId, opts.bag, authTick])

  const setAndPersist = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
        writeLocal(next)
        if (!mock && getAccessToken()) {
          const save = opts.save ?? ((id: string, v: T) => apiPutVenueData(id, opts.bag, v))
          void save(venueId, next).catch((err) => reportApiError(err))
        }
        return next
      })
    },
    [mock, venueId, opts.bag, opts.save, writeLocal],
  )

  return { value, setValue: setAndPersist, venueId, hydrated, mock }
}
