import { Link, Navigate, Outlet } from 'react-router-dom'
import { LogOut, Store } from 'lucide-react'
import { BrandLogo } from '@/components/app/BrandLogo'
import { RequireAuth } from '@/components/app/RequireAuth'
import {
  clearStoreSetupPending,
  isStoreSetupPending,
  readOnboardingDraft,
} from '@/features/admin/onboarding/store-setup'
import { useAuth } from '@/hooks/use-auth'
import { BRAND_NAME } from '@/lib/brand'

/**
 * Focused shell for Create Your Profile — avoids demo venue (Masala Bear)
 * chrome while a new account is still setting up.
 */
export function OnboardingLayout() {
  if (!isStoreSetupPending()) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <RequireAuth role="restaurant">
      <OnboardingShell />
    </RequireAuth>
  )
}

function OnboardingShell() {
  const { logout } = useAuth()
  const email = readOnboardingDraft()?.email ?? 'new account'

  const signOut = () => {
    clearStoreSetupPending()
    logout()
  }

  return (
    <div className="flex min-h-screen bg-[#F4F6F9] font-marketBody text-[#0F172A]">
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-[#E2E8F0] px-5">
          <BrandLogo size={28} className="rounded-md" />
          <div className="min-w-0">
            <p className="truncate font-marketing text-sm font-bold tracking-tight">
              {BRAND_NAME}
            </p>
            <p className="truncate text-[10px] text-[#94A3B8]">Store setup</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5">
          <Link
            to="/onboarding"
            className="flex h-10 items-center gap-3 rounded-xl bg-[#3B82F6] px-3 text-sm font-semibold text-white"
          >
            <Store className="h-4 w-4" />
            Create store
          </Link>
        </nav>
        <div className="border-t border-[#E2E8F0] px-4 py-4">
          <p className="truncate text-[11px] text-[#94A3B8]">Signed in as</p>
          <p className="truncate text-xs font-medium text-[#334155]">{email}</p>
          <Link
            to="/login"
            onClick={signOut}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-[#E2E8F0] bg-white px-4 md:hidden">
          <BrandLogo size={28} className="rounded-md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{BRAND_NAME}</p>
            <p className="truncate text-[11px] text-[#94A3B8]">{email}</p>
          </div>
          <Link
            to="/login"
            onClick={signOut}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-500"
          >
            <LogOut className="h-3.5 w-3.5" />
            Out
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
