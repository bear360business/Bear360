import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { LifeBuoy, MessageSquarePlus, Send } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/app/EmptyState'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import {
  SUPPORT_CATEGORY_META,
  SUPPORT_PRIORITY_META,
  SUPPORT_STATUS_META,
  useSupport,
  type SupportCategory,
  type SupportPriority,
  type SupportTicket,
} from '@/hooks/use-support'
import { cn } from '@/lib/utils'

function StatusPill({ status }: { status: SupportTicket['status'] }) {
  const meta = SUPPORT_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
        meta.tone === 'info' && 'bg-info-tint text-info',
        meta.tone === 'warning' && 'bg-warning-tint text-warning',
        meta.tone === 'success' && 'bg-success-tint text-success',
        meta.tone === 'muted' && 'bg-surface-muted text-muted-foreground',
      )}
    >
      {meta.label}
    </span>
  )
}

/** Restaurant owner ↔ Bear 360 support inbox. */
export function SupportPage() {
  const venue = useCurrentVenue()
  const { ticketsForRestaurant, createTicket, reply, setStatus } = useSupport()
  const tickets = ticketsForRestaurant(venue.id)
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null)
  const selected = tickets.find((t) => t.id === selectedId) ?? tickets[0] ?? null

  const [composeOpen, setComposeOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<SupportCategory>('technical')
  const [priority, setPriority] = useState<SupportPriority>('normal')
  const [body, setBody] = useState('')
  const [replyBody, setReplyBody] = useState('')

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === 'open' || t.status === 'pending').length,
    [tickets],
  )

  const submitTicket = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Add a subject and message')
      return
    }
    const ticket = createTicket({
      restaurantId: venue.id,
      restaurantName: venue.name,
      subject,
      category,
      priority,
      body,
      createdByName: venue.ownerName || 'Owner',
      createdByEmail: venue.ownerEmail,
    })
    setSelectedId(ticket.id)
    setComposeOpen(false)
    setSubject('')
    setBody('')
    setCategory('technical')
    setPriority('normal')
    toast.success(`Ticket #${ticket.number} sent to Bear 360 support`)
  }

  const sendReply = () => {
    if (!selected || !replyBody.trim()) return
    if (selected.status === 'closed') {
      toast.error('This ticket is closed')
      return
    }
    reply({
      ticketId: selected.id,
      authorRole: 'restaurant',
      authorName: venue.ownerName || 'Owner',
      body: replyBody,
      nextStatus: 'open',
    })
    setReplyBody('')
    toast.success('Reply sent')
  }

  return (
    <>
      <PageHeader
        title="Support"
        caption="Message Bear 360 platform support — billing, tech, and account help."
        actions={
          <Button className="rounded-full font-semibold" onClick={() => setComposeOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" />
            New ticket
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{tickets.length}</strong> tickets
        </span>
        <span>·</span>
        <span>
          <strong className="text-foreground">{openCount}</strong> open / awaiting you
        </span>
      </div>

      {tickets.length === 0 ? (
        <Card className="rounded-card border-line shadow-card">
          <CardContent className="p-6">
            <EmptyState
              icon={LifeBuoy}
              title="No support tickets yet"
              description="Create a ticket when you need help from the Bear 360 team."
              action={
                <Button className="rounded-full" onClick={() => setComposeOpen(true)}>
                  New ticket
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="rounded-card border-line shadow-card lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
            <ul className="divide-y divide-line">
              {tickets.map((t) => {
                const active = (selected?.id ?? null) === t.id
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        'flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors',
                        active ? 'bg-brand-tint' : 'hover:bg-surface-muted/60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold">{t.subject}</p>
                        <StatusPill status={t.status} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        #{t.number} ·{' '}
                        {SUPPORT_CATEGORY_META.find((c) => c.id === t.category)?.label} ·{' '}
                        {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          {selected && (
            <Card className="flex min-h-[420px] flex-col rounded-card border-line shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <p className="text-xs text-muted-foreground">Ticket #{selected.number}</p>
                  <h2 className="font-display text-lg font-bold">{selected.subject}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {SUPPORT_CATEGORY_META.find((c) => c.id === selected.category)?.label} ·{' '}
                    {SUPPORT_PRIORITY_META[selected.priority]} priority
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={selected.status} />
                  {selected.status !== 'closed' && selected.status !== 'resolved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setStatus(selected.id, 'resolved')
                        toast.success('Marked resolved')
                      }}
                    >
                      Mark resolved
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {selected.messages.map((m) => {
                  const mine = m.authorRole === 'restaurant'
                  return (
                    <div
                      key={m.id}
                      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                          mine
                            ? 'bg-ink-900 text-white'
                            : 'border border-line bg-surface-muted/70 text-foreground',
                        )}
                      >
                        <p className="text-[11px] font-semibold opacity-70">
                          {mine ? 'You' : m.authorName}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        <p className="mt-2 text-[10px] opacity-60">
                          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {selected.status === 'closed' ? (
                <p className="border-t border-line px-5 py-4 text-sm text-muted-foreground">
                  This ticket is closed. Open a new one if you need more help.
                </p>
              ) : (
                <div className="border-t border-line px-5 py-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Write a reply to Bear 360 support…"
                      rows={2}
                      className="min-h-[44px] resize-none"
                    />
                    <Button
                      className="h-auto shrink-0 rounded-xl px-4"
                      disabled={!replyBody.trim()}
                      onClick={sendReply}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>New support ticket</SheetTitle>
            <SheetDescription>
              Your message goes to the Bear 360 super-admin support queue.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sup-subject">Subject</Label>
              <Input
                id="sup-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of the issue"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as SupportCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_CATEGORY_META.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as SupportPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SUPPORT_PRIORITY_META) as SupportPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {SUPPORT_PRIORITY_META[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-body">Message</Label>
              <Textarea
                id="sup-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Describe what’s going wrong, what you expected, and any steps to reproduce."
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" className="rounded-full" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-full font-semibold" onClick={submitTicket}>
              Send ticket
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
