import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const ownerTabs = [
  { to: '/menu', end: true, label: 'Items' },
  { to: '/menu/categories', label: 'Categories' },
  { to: '/menu/appearance', label: 'Appearance' },
]

const staffTabs = [{ to: '/menu', end: true, label: 'Items' }]

/** Sub-nav: menu items + category master (+ appearance for owners). */
export function MenuShell() {
  const { session } = useAuth()
  const isStaff = session?.role === 'staff'
  const tabs = isStaff ? staffTabs : ownerTabs

  return (
    <>
      {tabs.length > 1 && (
        <nav
          aria-label="Menu sections"
          className="mb-6 flex gap-1 overflow-x-auto rounded-card border border-line bg-surface p-1 shadow-card"
        >
          {tabs.map((tab) => (
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
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}
      <Outlet />
    </>
  )
}
