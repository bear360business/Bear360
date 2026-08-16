import { Link } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { PageHeader } from '@/components/app/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

export interface ModuleComingSoonProps {
  title: string
  /** What the module will do once built. */
  summary: string
  screens: string[]
  /** Build phase from BEARQR_SAAS_UI_ARCHITECTURE.md §15.2. */
  phase: string
}

/**
 * Honest placeholder for a module that is entitled but not built yet — better
 * than a dead nav link, and it never pretends to be the real screen.
 */
export function ModuleComingSoon({ title, summary, screens, phase }: ModuleComingSoonProps) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="max-w-[640px] rounded-card border-line shadow-card">
        <CardContent className="p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted">
            <Hammer className="h-6 w-6 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">{title} is being built</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{summary}</p>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Screens in this module
          </p>
          <ul className="mt-2 space-y-1.5">
            {screens.map((screen) => (
              <li key={screen} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {screen}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">
            Scheduled for {phase}. The full layout spec lives in{' '}
            <code className="rounded bg-surface-muted px-1 py-0.5">
              BEARQR_SAAS_UI_ARCHITECTURE.md
            </code>
            .
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex h-10 items-center rounded-[10px] bg-brand px-5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </>
  )
}
