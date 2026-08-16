import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isSuperAdmin } from '@/lib/auth'
import {
  apiGetPlatformConfig,
  apiPutPlatformConfig,
  apiSubmitLead,
} from '@/lib/api-platform'
import { useMockData } from '@/lib/runtime-config'
import { reportApiError } from '@/lib/api-error'

export const LEADS_STORAGE_KEY = 'bearqr:marketing-leads'
export const LEADS_EVENT = 'bearqr:leads-changed'

export type LeadStatus = 'new' | 'contacted' | 'closed'
export type LeadInterest = 'trial' | 'demo' | 'enterprise' | 'partnership' | 'other'

export interface MarketingLead {
  id: string
  name: string
  email: string
  phone: string
  businessName: string
  city: string
  interest: LeadInterest
  message: string
  status: LeadStatus
  createdAt: string
  /** Demo “email” destination (super admin inbox). */
  toEmail: string
  /** Super teammate handling this lead. */
  assignee?: string
  /** Internal triage notes. */
  notes?: string
  /** Venue id if converted to a trial store. */
  convertedRestaurantId?: string
}

export const LEAD_INTEREST_META: { id: LeadInterest; label: string }[] = [
  { id: 'trial', label: 'Start a trial' },
  { id: 'demo', label: 'Book a product demo' },
  { id: 'enterprise', label: 'Enterprise / multi-branch' },
  { id: 'partnership', label: 'Partnership' },
  { id: 'other', label: 'Something else' },
]

/** Super admin inbox that receives Talk to us messages in this demo. */
export const SUPER_INBOX_EMAIL = 'anya@bear360.app'

function uid() {
  return `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function readStored(): MarketingLead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MarketingLead[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStored(leads: MarketingLead[]) {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads))
    window.dispatchEvent(new Event(LEADS_EVENT))
  } catch {
    /* ignore */
  }
}

function persistLeads(leads: MarketingLead[], mock: boolean) {
  writeStored(leads)
  if (!mock && isSuperAdmin()) {
    void apiPutPlatformConfig({ leads }).catch((err) => reportApiError(err))
  }
}

function normalizeLead(raw: unknown, fallback?: MarketingLead): MarketingLead | null {
  if (!raw || typeof raw !== 'object') return fallback ?? null
  const r = raw as Partial<MarketingLead>
  const id = typeof r.id === 'string' ? r.id : fallback?.id
  if (!id) return null
  return {
    id,
    name: String(r.name ?? fallback?.name ?? '').trim(),
    email: String(r.email ?? fallback?.email ?? '')
      .trim()
      .toLowerCase(),
    phone: String(r.phone ?? fallback?.phone ?? '').trim(),
    businessName: String(r.businessName ?? fallback?.businessName ?? '').trim(),
    city: String(r.city ?? fallback?.city ?? '').trim(),
    interest: (r.interest ?? fallback?.interest ?? 'other') as LeadInterest,
    message: String(r.message ?? fallback?.message ?? '').trim(),
    status: (r.status ?? fallback?.status ?? 'new') as LeadStatus,
    createdAt: String(r.createdAt ?? fallback?.createdAt ?? new Date().toISOString()),
    toEmail: String(r.toEmail ?? fallback?.toEmail ?? SUPER_INBOX_EMAIL),
    assignee: r.assignee ?? fallback?.assignee,
    notes: r.notes ?? fallback?.notes,
    convertedRestaurantId: r.convertedRestaurantId ?? fallback?.convertedRestaurantId,
  }
}

interface LeadsContextValue {
  leads: MarketingLead[]
  newCount: number
  submitLead: (input: {
    name: string
    email: string
    phone?: string
    businessName?: string
    city?: string
    interest: LeadInterest
    message: string
  }) => MarketingLead
  setStatus: (id: string, status: LeadStatus) => void
  updateLead: (
    id: string,
    patch: Partial<Pick<MarketingLead, 'assignee' | 'notes' | 'status' | 'convertedRestaurantId'>>,
  ) => void
  remove: (id: string) => void
}

const LeadsContext = createContext<LeadsContextValue | null>(null)

export function LeadsProvider({ children }: { children: ReactNode }) {
  const mock = useMockData()
  const [leads, setLeads] = useState<MarketingLead[]>(() => readStored())

  useEffect(() => {
    const sync = () => setLeads(readStored())
    window.addEventListener(LEADS_EVENT, sync)
    window.addEventListener('storage', (e) => {
      if (e.key === LEADS_STORAGE_KEY || e.key === null) sync()
    })
    return () => window.removeEventListener(LEADS_EVENT, sync)
  }, [])

  useEffect(() => {
    if (mock || !isSuperAdmin()) return
    let cancelled = false
    void apiGetPlatformConfig()
      .then((cfg) => {
        if (cancelled) return
        const remote = cfg.leads
        if (!Array.isArray(remote)) return
        const next = remote
          .map((row) => normalizeLead(row))
          .filter((row): row is MarketingLead => row != null)
        writeStored(next)
        setLeads(next)
      })
      .catch((err) => reportApiError(err))
    return () => {
      cancelled = true
    }
  }, [mock])

  const submitLead = useCallback(
    (input: {
      name: string
      email: string
      phone?: string
      businessName?: string
      city?: string
      interest: LeadInterest
      message: string
    }) => {
      const lead: MarketingLead = {
        id: uid(),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: (input.phone ?? '').trim(),
        businessName: (input.businessName ?? '').trim(),
        city: (input.city ?? '').trim(),
        interest: input.interest,
        message: input.message.trim(),
        status: 'new',
        createdAt: new Date().toISOString(),
        toEmail: SUPER_INBOX_EMAIL,
      }

      if (mock) {
        setLeads((prev) => {
          const next = [lead, ...prev]
          writeStored(next)
          return next
        })
        return lead
      }

      void apiSubmitLead({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || undefined,
        businessName: lead.businessName || undefined,
        city: lead.city || undefined,
        interest: lead.interest,
        message: lead.message,
      })
        .then((created) => {
          const serverLead = normalizeLead(created, lead) ?? lead
          setLeads((prev) => {
            const next = [serverLead, ...prev.filter((l) => l.id !== serverLead.id)]
            writeStored(next)
            return next
          })
        })
        .catch((err) => {
          reportApiError(err, 'Lead saved locally — server sync failed')
          setLeads((prev) => {
            const next = [lead, ...prev]
            writeStored(next)
            return next
          })
        })

      return lead
    },
    [mock],
  )

  const setStatus = useCallback(
    (id: string, status: LeadStatus) => {
      setLeads((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, status } : l))
        persistLeads(next, mock)
        return next
      })
    },
    [mock],
  )

  const updateLead = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<MarketingLead, 'assignee' | 'notes' | 'status' | 'convertedRestaurantId'>
      >,
    ) => {
      setLeads((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
        persistLeads(next, mock)
        return next
      })
    },
    [mock],
  )

  const remove = useCallback(
    (id: string) => {
      setLeads((prev) => {
        const next = prev.filter((l) => l.id !== id)
        persistLeads(next, mock)
        return next
      })
    },
    [mock],
  )

  const newCount = useMemo(
    () => leads.filter((l) => l.status === 'new').length,
    [leads],
  )

  const value = useMemo(
    () => ({ leads, newCount, submitLead, setStatus, updateLead, remove }),
    [leads, newCount, submitLead, setStatus, updateLead, remove],
  )

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
}

export function useLeads(): LeadsContextValue {
  const ctx = useContext(LeadsContext)
  if (!ctx) throw new Error('useLeads must be used within <LeadsProvider>')
  return ctx
}
