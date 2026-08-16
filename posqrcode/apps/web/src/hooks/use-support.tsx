import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isSuperAdmin } from '@/lib/auth'
import { apiGetPlatformConfig, apiPutPlatformConfig } from '@/lib/api-platform'
import { useMockData } from '@/lib/runtime-config'
import { reportApiError } from '@/lib/api-error'
import { useAuthTick } from '@/hooks/use-auth-tick'

export const SUPPORT_STORAGE_KEY = 'bearqr:support-tickets'

export type SupportStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SupportCategory =
  | 'billing'
  | 'technical'
  | 'account'
  | 'feature'
  | 'other'

export type SupportAuthorRole = 'restaurant' | 'super'

export interface SupportMessage {
  id: string
  authorRole: SupportAuthorRole
  authorName: string
  body: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  number: number
  restaurantId: string
  restaurantName: string
  subject: string
  category: SupportCategory
  priority: SupportPriority
  status: SupportStatus
  createdByName: string
  createdByEmail: string
  createdAt: string
  updatedAt: string
  messages: SupportMessage[]
  /** Super teammate assigned to this ticket. */
  assignee?: string
  /** Internal note (not shown to restaurant). */
  internalNote?: string
}

export const SUPPORT_CATEGORY_META: {
  id: SupportCategory
  label: string
}[] = [
  { id: 'billing', label: 'Billing & plans' },
  { id: 'technical', label: 'Technical issue' },
  { id: 'account', label: 'Account & access' },
  { id: 'feature', label: 'Feature request' },
  { id: 'other', label: 'Other' },
]

export const SUPPORT_STATUS_META: Record<
  SupportStatus,
  { label: string; tone: 'info' | 'warning' | 'success' | 'muted' }
> = {
  open: { label: 'Open', tone: 'info' },
  pending: { label: 'Awaiting restaurant', tone: 'warning' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'muted' },
}

export const SUPPORT_PRIORITY_META: Record<SupportPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function readStored(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(SUPPORT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SupportTicket[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(tickets))
  } catch {
    /* ignore */
  }
}

interface SupportContextValue {
  tickets: SupportTicket[]
  openCount: number
  getById: (id: string) => SupportTicket | undefined
  ticketsForRestaurant: (restaurantId: string) => SupportTicket[]
  createTicket: (input: {
    restaurantId: string
    restaurantName: string
    subject: string
    category: SupportCategory
    priority?: SupportPriority
    body: string
    createdByName: string
    createdByEmail: string
  }) => SupportTicket
  reply: (input: {
    ticketId: string
    authorRole: SupportAuthorRole
    authorName: string
    body: string
    /** When super replies, default status → pending; restaurant reply → open. */
    nextStatus?: SupportStatus
  }) => void
  setStatus: (ticketId: string, status: SupportStatus) => void
  setPriority: (ticketId: string, priority: SupportPriority) => void
  updateTicket: (
    ticketId: string,
    patch: Partial<Pick<SupportTicket, 'assignee' | 'internalNote' | 'status' | 'priority'>>,
  ) => void
  /** Bulk triage for high-volume Super queue. */
  bulkUpdate: (
    ids: string[],
    patch: Partial<Pick<SupportTicket, 'assignee' | 'status' | 'priority'>>,
  ) => void
}

const SupportContext = createContext<SupportContextValue | null>(null)

export function SupportProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const authTick = useAuthTick()
  const apiReady = useRef(mock)
  const [tickets, setTickets] = useState<SupportTicket[]>(() => readStored())

  useEffect(() => {
    writeStored(tickets)
    if (!mock && apiReady.current && isSuperAdmin()) {
      void apiPutPlatformConfig({ support: tickets }).catch((err) => reportApiError(err))
    }
  }, [tickets, mock])

  useEffect(() => {
    if (mock || !isSuperAdmin()) {
      apiReady.current = true
      return
    }
    let cancelled = false
    void apiGetPlatformConfig()
      .then((cfg) => {
        if (cancelled) return
        if (Array.isArray(cfg.support)) {
          const next = cfg.support as SupportTicket[]
          writeStored(next)
          setTickets(next)
        }
      })
      .catch((err) => reportApiError(err))
      .finally(() => {
        if (!cancelled) apiReady.current = true
      })
    return () => {
      cancelled = true
    }
  }, [mock, authTick])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SUPPORT_STORAGE_KEY || e.key === null) setTickets(readStored())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const getById = useCallback(
    (id: string) => tickets.find((t) => t.id === id),
    [tickets],
  )

  const ticketsForRestaurant = useCallback(
    (restaurantId: string) =>
      tickets
        .filter((t) => t.restaurantId === restaurantId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [tickets],
  )

  const createTicket: SupportContextValue['createTicket'] = useCallback((input) => {
    const now = new Date().toISOString()
    const number =
      tickets.reduce((max, t) => Math.max(max, t.number), 1000) + 1
    const created: SupportTicket = {
      id: uid('sup'),
      number,
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
      subject: input.subject.trim(),
      category: input.category,
      priority: input.priority ?? 'normal',
      status: 'open',
      createdByName: input.createdByName,
      createdByEmail: input.createdByEmail,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: uid('msg'),
          authorRole: 'restaurant',
          authorName: input.createdByName,
          body: input.body.trim(),
          createdAt: now,
        },
      ],
    }
    setTickets((prev) => [created, ...prev])
    return created
  }, [tickets])

  const reply: SupportContextValue['reply'] = useCallback((input) => {
    const now = new Date().toISOString()
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== input.ticketId) return t
        if (t.status === 'closed') return t
        const nextStatus =
          input.nextStatus ??
          (input.authorRole === 'super'
            ? 'pending'
            : t.status === 'resolved'
              ? 'open'
              : 'open')
        return {
          ...t,
          status: nextStatus,
          updatedAt: now,
          messages: [
            ...t.messages,
            {
              id: uid('msg'),
              authorRole: input.authorRole,
              authorName: input.authorName,
              body: input.body.trim(),
              createdAt: now,
            },
          ],
        }
      }),
    )
  }, [])

  const setStatus = useCallback((ticketId: string, status: SupportStatus) => {
    const now = new Date().toISOString()
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status, updatedAt: now } : t)),
    )
  }, [])

  const setPriority = useCallback((ticketId: string, priority: SupportPriority) => {
    const now = new Date().toISOString()
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, priority, updatedAt: now } : t)),
    )
  }, [])

  const updateTicket = useCallback(
    (
      ticketId: string,
      patch: Partial<
        Pick<SupportTicket, 'assignee' | 'internalNote' | 'status' | 'priority'>
      >,
    ) => {
      const now = new Date().toISOString()
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...patch, updatedAt: now } : t)),
      )
    },
    [],
  )

  const bulkUpdate = useCallback(
    (
      ids: string[],
      patch: Partial<Pick<SupportTicket, 'assignee' | 'status' | 'priority'>>,
    ) => {
      if (ids.length === 0) return
      const idSet = new Set(ids)
      const now = new Date().toISOString()
      setTickets((prev) =>
        prev.map((t) => (idSet.has(t.id) ? { ...t, ...patch, updatedAt: now } : t)),
      )
    },
    [],
  )

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === 'open' || t.status === 'pending').length,
    [tickets],
  )

  const value = useMemo(
    () => ({
      tickets,
      openCount,
      getById,
      ticketsForRestaurant,
      createTicket,
      reply,
      setStatus,
      setPriority,
      updateTicket,
      bulkUpdate,
    }),
    [
      tickets,
      openCount,
      getById,
      ticketsForRestaurant,
      createTicket,
      reply,
      setStatus,
      setPriority,
      updateTicket,
      bulkUpdate,
    ],
  )

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>
}

export function useSupport(): SupportContextValue {
  const ctx = useContext(SupportContext)
  if (!ctx) throw new Error('useSupport must be used within <SupportProvider>')
  return ctx
}
