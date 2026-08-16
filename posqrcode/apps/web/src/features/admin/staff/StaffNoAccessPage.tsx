import { Link, Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

/** Shown when a staff member has no POS Staff permissions enabled. */
export function StaffNoAccessPage() {
  const { logout, session } = useAuth()

  if (session?.role !== 'staff') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="rounded-card border border-line bg-surface shadow-card">
      <EmptyState
        icon={Lock}
        title="No access yet"
        description={
          session?.staffName
            ? `${session.staffName}, your manager hasn’t granted any modules. Ask them to enable POS, Orders, Menu, or Expenses under Staff → POS Staff.`
            : 'Ask your manager to enable modules under Staff → POS Staff.'
        }
        action={
          <Button
            variant="outline"
            onClick={() => {
              logout()
            }}
            asChild
          >
            <Link to="/staff-login">Back to staff login</Link>
          </Button>
        }
      />
    </div>
  )
}
