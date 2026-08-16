import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export interface PageHeaderProps {
  title: string
  caption?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
}

/** H1 + caption + right action slot; stacks on mobile (doc §7.14). */
export function PageHeader({ title, caption, backHref, backLabel = 'Back', actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {backHref && (
          <Link
            to={backHref}
            className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        )}
        <h1 className="font-display text-2xl font-bold text-foreground md:text-[28px] md:leading-9">
          {title}
        </h1>
        {caption && <p className="mt-1 text-sm text-muted-foreground">{caption}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
