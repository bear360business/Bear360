import { NavLink, Outlet } from 'react-router-dom'
import { useIndustryCopy } from '@/hooks/use-industry-copy'
import { useTables } from '@/hooks/use-tables'
import { cn } from '@/lib/utils'

/** Sub-nav for floor map and reservation book. */
export function TablesShell() {
  const { upcomingCount } = useTables()
  const copy = useIndustryCopy()

  const tabs = [
    { to: '/tables', end: true, label: 'Floor' },
    {
      to: '/tables/reservations',
      label: 'Reservations',
      badge: upcomingCount,
    },
  ]

  return (
    <>
      <nav
        aria-label={`${copy.spaces} sections`}
        className="mb-6 flex gap-1 overflow-x-auto rounded-card border border-line bg-surface p-1 shadow-card"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'inline-flex shrink-0 items-center gap-2 rounded-[10px] px-3.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand text-foreground'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )
            }
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {tab.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
