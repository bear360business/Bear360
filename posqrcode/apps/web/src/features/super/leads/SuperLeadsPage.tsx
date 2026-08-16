import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Mail, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LEAD_INTEREST_META,
  useLeads,
  type LeadStatus,
  type MarketingLead,
} from '@/hooks/use-leads'
import { useRestaurants } from '@/hooks/use-restaurants'
import { DEMO_OWNER_PASSWORD, provisionRestaurantOwner } from '@/lib/auth'
import { applyIndustryDefaultsForVenue } from '@/lib/venue-entitlements'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  closed: 'Closed',
}

/** Super Admin inbox for website “Talk to us” / contact form emails. */
export function SuperLeadsPage() {
  const { leads, newCount, setStatus, updateLead, remove } = useLeads()
  const { create } = useRestaurants()
  const [filter, setFilter] = useState<'all' | LeadStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  const filtered = useMemo(() => {
    return leads
      .filter((l) => (filter === 'all' ? true : l.status === filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [leads, filter])

  const selected: MarketingLead | null =
    filtered.find((l) => l.id === selectedId) ??
    leads.find((l) => l.id === selectedId) ??
    filtered[0] ??
    null

  const interestLabel = (id: MarketingLead['interest']) =>
    LEAD_INTEREST_META.find((m) => m.id === id)?.label ?? id

  return (
    <>
      <PageHeader
        title="Leads & contact"
        caption={`Website Talk to us messages · ${newCount} new`}
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No messages yet"
          description="When a visitor submits Talk to us on the marketing site, it appears here as an email to Super Admin."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="rounded-card border-line shadow-card">
            <CardContent className="space-y-3 p-4">
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as 'all' | LeadStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All leads</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                {filtered.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(l.id)}
                      className={cn(
                        'w-full rounded-xl px-3 py-2.5 text-left transition-colors',
                        selected?.id === l.id
                          ? 'bg-brand-tint'
                          : 'hover:bg-surface-muted',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{l.name}</p>
                        {l.status === 'new' && (
                          <span className="shrink-0 rounded-full bg-info-tint px-1.5 py-0.5 text-[10px] font-bold text-info">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{l.email}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {selected ? (
            <Card className="rounded-card border-line shadow-card">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      To {selected.toEmail}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground">{selected.email}</p>
                  </div>
                  <Select
                    value={selected.status}
                    onValueChange={(v) => {
                      setStatus(selected.id, v as LeadStatus)
                      toast.success(`Marked ${STATUS_LABEL[v as LeadStatus].toLowerCase()}`)
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <dl className="grid gap-3 rounded-xl border border-line bg-surface-muted/40 px-4 py-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Interest</dt>
                    <dd className="font-medium">{interestLabel(selected.interest)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Business</dt>
                    <dd className="font-medium">{selected.businessName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd className="font-medium">{selected.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">City</dt>
                    <dd className="font-medium">{selected.city || '—'}</dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Message
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {selected.message}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Assignee
                    </p>
                    <Select
                      value={selected.assignee || 'unassigned'}
                      onValueChange={(v) =>
                        updateLead(selected.id, {
                          assignee: v === 'unassigned' ? undefined : v,
                          status: selected.status === 'new' ? 'contacted' : selected.status,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="Anya A.">Anya A.</SelectItem>
                        <SelectItem value="Sam Torres">Sam Torres</SelectItem>
                        <SelectItem value="Jin Park">Jin Park</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Internal notes
                    </p>
                    <Textarea
                      rows={2}
                      value={notesDraft || selected.notes || ''}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Call notes, next step…"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 rounded-full"
                      onClick={() => {
                        updateLead(selected.id, { notes: notesDraft || selected.notes })
                        setNotesDraft('')
                        toast.success('Notes saved')
                      }}
                    >
                      Save notes
                    </Button>
                  </div>
                </div>

                {selected.convertedRestaurantId && (
                  <p className="rounded-lg bg-success-tint px-3 py-2 text-sm text-success">
                    Converted to trial ·{' '}
                    <Link
                      className="font-semibold underline"
                      to={`/super/restaurants/${selected.convertedRestaurantId}/edit`}
                    >
                      Open venue
                    </Link>
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  <Button asChild className="rounded-full">
                    <a href={`mailto:${selected.email}?subject=Re: ${BRAND_SUBJECT(selected)}`}>
                      Reply by email
                    </a>
                  </Button>
                  {!selected.convertedRestaurantId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        const name =
                          selected.businessName.trim() || `${selected.name}'s Kitchen`
                        void create({
                          name,
                          ownerName: selected.name.trim() || 'Owner',
                          ownerEmail: selected.email,
                          phone: selected.phone || undefined,
                          city: selected.city || undefined,
                          industryId: 'restaurants',
                          planId: 'basic',
                        }).then((venue) => {
                          applyIndustryDefaultsForVenue(venue.id, 'restaurants')
                          const provision = provisionRestaurantOwner(
                            selected.email,
                            venue.id,
                          )
                          updateLead(selected.id, {
                            status: 'closed',
                            convertedRestaurantId: venue.id,
                          })
                          toast.success(`Trial store created: ${venue.name}`, {
                            description: provision.ok
                              ? `${selected.email} / ${DEMO_OWNER_PASSWORD}`
                              : provision.error,
                          })
                        }).catch((err: unknown) => {
                          toast.error(
                            err instanceof Error ? err.message : 'Could not create store',
                          )
                        })
                      }}
                    >
                      Convert to trial
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full text-danger"
                    onClick={() => {
                      remove(selected.id)
                      setSelectedId(null)
                      toast.message('Lead removed')
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={Mail}
              title="Select a lead"
              description="Pick a message from the list to read it."
            />
          )}
        </div>
      )}
    </>
  )
}

function BRAND_SUBJECT(lead: MarketingLead) {
  return encodeURIComponent(`Your ${lead.interest} enquiry — Bear 360`)
}
