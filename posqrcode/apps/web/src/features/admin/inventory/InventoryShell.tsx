import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/inventory', end: true, label: 'Stock' },
  { to: '/inventory/items', label: 'Ingredients' },
  { to: '/inventory/categories', label: 'Categories' },
  { to: '/inventory/suppliers', label: 'Suppliers' },
  { to: '/inventory/purchases', label: 'Purchases' },
]

/** Sub-nav for Inventory stock, masters and purchase ledger (doc §8.4). */
export function InventoryShell() {
  return (
    <>
      <nav
        aria-label="Inventory sections"
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
      <Outlet />
    </>
  )
}
