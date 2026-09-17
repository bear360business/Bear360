import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiListTables, apiRemoveTable, apiUpsertTable } from '@/lib/api-catalog'
import { getAccessToken } from '@/lib/api-client'
import { apiGetVenueData, apiPutVenueData } from '@/lib/api-platform'
import { useMockData } from '@/lib/runtime-config'
import type { DiningTable, Reservation, ReservationStatus } from '@/lib/types'
import {
  readVenueScoped,
  resolveDataVenueId,
  subscribeVenueScope,
  writeVenueScoped,
} from '@/lib/venue-scope'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

const TABLES_KEY = 'bearqr:tables'
const RES_KEY = 'bearqr:reservations'

interface TablesContextValue {
  tables: DiningTable[]
  reservations: Reservation[]
  upcomingCount: number
  upsertTable: (table: DiningTable) => void
  removeTable: (id: string) => void
  markFree: (id: string) => void
  seatReservation: (reservationId: string) => void
  setReservationStatus: (id: string, status: ReservationStatus) => void
  saveReservation: (reservation: Reservation) => void
  /** Reconcile floor from live orders + open reservations. */
  reconcile: (activeOrderByTable: Record<string, string>) => void
}

const TablesContext = createContext<TablesContextValue | null>(null)

function loadTables(venueId: string) {
  return readVenueScoped(TABLES_KEY, venueId, [] as DiningTable[])
}

function loadReservations(venueId: string) {
  return readVenueScoped(RES_KEY, venueId, [] as Reservation[])
}

export function TablesProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const [venueId, setVenueId] = useState(() => resolveDataVenueId())
  const [tables, setTables] = useState<DiningTable[]>(() =>
    loadTables(resolveDataVenueId()),
  )
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    loadReservations(resolveDataVenueId()),
  )

  useEffect(() => {
    writeVenueScoped(TABLES_KEY, venueId, tables)
  }, [tables, venueId])

  useEffect(() => {
    writeVenueScoped(RES_KEY, venueId, reservations)
    if (!mock && getAccessToken()) {
      void apiPutVenueData(venueId, 'reservations', reservations).catch((err) => reportApiError(err))
    }
  }, [reservations, venueId, mock])

  useEffect(
    () =>
      subscribeVenueScope(() => {
        const next = resolveDataVenueId()
        if (!next || next === venueId) return
        setVenueId(next)
        setTables(loadTables(next))
        setReservations(loadReservations(next))
      }),
    [venueId],
  )

  useEffect(() => {
    if (mock || !getAccessToken()) return
    let cancelled = false
    void Promise.all([
      apiListTables(venueId),
      apiGetVenueData<Reservation[]>(venueId, 'reservations'),
    ])
      .then(([tableRows, resRows]) => {
        if (cancelled) return
        setTables(tableRows)
        writeVenueScoped(TABLES_KEY, venueId, tableRows)
        if (Array.isArray(resRows)) {
          setReservations(resRows)
          writeVenueScoped(RES_KEY, venueId, resRows)
        }
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock, venueId, authTick])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const tKey = `${TABLES_KEY}:${venueId}`
      const rKey = `${RES_KEY}:${venueId}`
      if (e.key === tKey || e.key === TABLES_KEY) setTables(loadTables(venueId))
      if (e.key === rKey || e.key === RES_KEY) setReservations(loadReservations(venueId))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [venueId])

  const upsertTable = useCallback(
    (table: DiningTable) => {
      setTables((prev) => {
        const i = prev.findIndex((t) => t.id === table.id || t.number === table.number)
        if (i < 0) return [...prev, table]
        const next = [...prev]
        next[i] = table
        return next
      })
      if (!mock) {
        void apiUpsertTable(venueId, table)
          .then((saved) => {
            if (saved && saved.id) {
              setTables((prev) =>
                prev.map((t) =>
                  t.id === table.id || t.number === saved.number ? { ...t, ...saved } : t,
                ),
              )
            }
          })
          .catch((err) => reportApiError(err))
      }
    },
    [mock, venueId],
  )

  const removeTable = useCallback(
    (id: string) => {
      setTables((prev) => prev.filter((t) => t.id !== id))
      if (!mock) void apiRemoveTable(venueId, id).catch((err) => reportApiError(err))
    },
    [mock, venueId],
  )

  const markFree = useCallback(
    (id: string) => {
      setTables((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? { ...t, status: 'free' as const, activeOrderId: undefined, reservationId: undefined }
            : t,
        )
        const freed = next.find((t) => t.id === id)
        if (!mock && freed) void apiUpsertTable(venueId, freed).catch((err) => reportApiError(err))
        return next
      })
      setReservations((prev) =>
        prev.map((r) =>
          r.tableId === id && (r.status === 'confirmed' || r.status === 'pending')
            ? { ...r, status: 'cancelled' as const }
            : r,
        ),
      )
    },
    [mock, venueId],
  )

  const seatReservation = useCallback(
    (reservationId: string) => {
      setReservations((prev) => {
        const res = prev.find((r) => r.id === reservationId)
        if (res?.tableId) {
          setTables((tablesPrev) => {
            const next = tablesPrev.map((t) =>
              t.id === res.tableId
                ? {
                    ...t,
                    status: 'occupied' as const,
                    reservationId: undefined,
                    activeOrderId: t.activeOrderId,
                  }
                : t,
            )
            const hit = next.find((t) => t.id === res.tableId)
            if (!mock && hit) void apiUpsertTable(venueId, hit).catch((err) => reportApiError(err))
            return next
          })
        }
        return prev.map((r) => (r.id === reservationId ? { ...r, status: 'seated' as const } : r))
      })
    },
    [mock, venueId],
  )

  const setReservationStatus = useCallback(
    (id: string, status: ReservationStatus) => {
      setReservations((prev) => {
        const res = prev.find((r) => r.id === id)
        if (res?.tableId) {
          if (status === 'confirmed' || status === 'pending') {
            setTables((tp) => {
              const next = tp.map((t) =>
                t.id === res.tableId && t.status !== 'occupied'
                  ? { ...t, status: 'reserved' as const, reservationId: id }
                  : t,
              )
              const hit = next.find((t) => t.id === res.tableId)
              if (!mock && hit) void apiUpsertTable(venueId, hit).catch((err) => reportApiError(err))
              return next
            })
          }
          if (status === 'cancelled' || status === 'no-show') {
            setTables((tp) => {
              const next = tp.map((t) =>
                t.id === res.tableId && t.reservationId === id
                  ? { ...t, status: 'free' as const, reservationId: undefined }
                  : t,
              )
              const hit = next.find((t) => t.id === res.tableId)
              if (!mock && hit) void apiUpsertTable(venueId, hit).catch((err) => reportApiError(err))
              return next
            })
          }
          if (status === 'seated') {
            setTables((tp) => {
              const next = tp.map((t) =>
                t.id === res.tableId
                  ? { ...t, status: 'occupied' as const, reservationId: undefined }
                  : t,
              )
              const hit = next.find((t) => t.id === res.tableId)
              if (!mock && hit) void apiUpsertTable(venueId, hit).catch((err) => reportApiError(err))
              return next
            })
          }
        }
        return prev.map((r) => (r.id === id ? { ...r, status } : r))
      })
    },
    [mock, venueId],
  )

  const saveReservation = useCallback((reservation: Reservation) => {
    setReservations((prev) => {
      const i = prev.findIndex((r) => r.id === reservation.id)
      if (i < 0) return [reservation, ...prev]
      const next = [...prev]
      next[i] = reservation
      return next
    })
    if (
      reservation.tableId &&
      (reservation.status === 'confirmed' || reservation.status === 'pending')
    ) {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === reservation.tableId) {
            return {
              ...t,
              status: t.status === 'occupied' ? t.status : 'reserved',
              reservationId: reservation.id,
            }
          }
          if (t.reservationId === reservation.id && t.id !== reservation.tableId) {
            return { ...t, status: 'free', reservationId: undefined }
          }
          return t
        }),
      )
    }
  }, [])

  const reconcile = useCallback((activeOrderByTable: Record<string, string>) => {
    setTables((prev) => {
      const openResByTable = new Map<string, string>()
      for (const r of reservations) {
        if (
          r.tableId &&
          (r.status === 'confirmed' || r.status === 'pending') &&
          !activeOrderByTable[r.tableId]
        ) {
          openResByTable.set(r.tableId, r.id)
        }
      }

      let changed = false
      const next = prev.map((t) => {
        const orderId = activeOrderByTable[t.id]
        if (orderId) {
          if (t.status === 'occupied' && t.activeOrderId === orderId) return t
          changed = true
          return {
            ...t,
            status: 'occupied' as const,
            activeOrderId: orderId,
            reservationId: undefined,
          }
        }
        const resId = openResByTable.get(t.id)
        if (resId) {
          if (t.status === 'reserved' && t.reservationId === resId) return t
          changed = true
          return {
            ...t,
            status: 'reserved' as const,
            reservationId: resId,
            activeOrderId: undefined,
          }
        }
        // Manual occupied without order (seated reservation waiting for POS) — keep
        if (t.status === 'occupied' && !t.activeOrderId) return t
        if (t.status === 'free' && !t.activeOrderId && !t.reservationId) return t
        changed = true
        return {
          ...t,
          status: 'free' as const,
          activeOrderId: undefined,
          reservationId: undefined,
        }
      })
      return changed ? next : prev
    })
  }, [reservations])

  const upcomingCount = useMemo(
    () =>
      reservations.filter((r) => r.status === 'pending' || r.status === 'confirmed').length,
    [reservations],
  )

  const value = useMemo(
    () => ({
      tables,
      reservations,
      upcomingCount,
      upsertTable,
      removeTable,
      markFree,
      seatReservation,
      setReservationStatus,
      saveReservation,
      reconcile,
    }),
    [
      tables,
      reservations,
      upcomingCount,
      upsertTable,
      removeTable,
      markFree,
      seatReservation,
      setReservationStatus,
      saveReservation,
      reconcile,
    ],
  )

  return <TablesContext.Provider value={value}>{children}</TablesContext.Provider>
}

export function useTables(): TablesContextValue {
  const ctx = useContext(TablesContext)
  if (!ctx) throw new Error('useTables must be used within a <TablesProvider>')
  return ctx
}
