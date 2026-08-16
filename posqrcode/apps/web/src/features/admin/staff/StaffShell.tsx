import { NavLink, Outlet } from 'react-router-dom'
import { useTenant } from '@/hooks/use-tenant'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/staff', end: true, label: 'Employees', feature: 'staff' as const },
  { to: '/staff/pos', label: 'POS Staff', feature: 'staff' as const },
  { to: '/staff/roles', label: 'Roles', feature: 'staff' as const },
  { to: '/staff/schedule', label: 'Schedule', feature: 'scheduler' as const },
  { to: '/staff/attendance', label: 'Attendance', feature: 'staff' as const },
  { to: '/staff/payroll', label: 'Payroll', feature: 'payroll' as const },
]

/** Shared sub-nav for the five Staff screens (doc §8.5). */
export function StaffShell() {
  const { features } = useTenant()

  return (
    <>
      <nav
        aria-label="Staff sections"
        className="mb-6 flex gap-1 overflow-x-auto rounded-card border border-line bg-surface p-1 shadow-card"
      >
        {tabs.map((tab) => {
          const locked = !features[tab.feature]
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand text-foreground'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                  locked && 'opacity-60',
                )
              }
            >
              {tab.label}
              {locked && (
                <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider">
                  Pro
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>
      <Outlet />
    </>
  )
}
