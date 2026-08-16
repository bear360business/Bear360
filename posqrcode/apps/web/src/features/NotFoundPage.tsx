import { Link } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="force-light flex min-h-screen items-center justify-center bg-surface-page px-4">
      <EmptyState
        icon={MapPinOff}
        title="Page not found"
        description="That link doesn’t exist. Head home, or try the live guest menu demo."
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild className="rounded-full font-semibold">
              <Link to="/">Back to home</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full font-semibold">
              <Link to="/r/masala-bear/table/t-04">Try guest demo</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}
