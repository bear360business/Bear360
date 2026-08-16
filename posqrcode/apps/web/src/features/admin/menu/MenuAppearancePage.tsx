import { Check, Lock } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useMenuAppearance, type MenuThemeId } from '@/hooks/use-menu-appearance'
import { cn } from '@/lib/utils'

/** Guest digital-menu theme picker — owner-only (persists for customer PWA). */
export function MenuAppearancePage() {
  const { session } = useAuth()
  const { appearance, setTheme, themes } = useMenuAppearance()

  if (session?.role === 'staff') {
    return <Navigate to="/menu" replace />
  }

  const save = () => {
    toast.success('Appearance saved', {
      description: `Guest menu theme: ${themes.find((t) => t.id === appearance.themeId)?.name}`,
    })
  }

  return (
    <>
      <PageHeader
        title="Menu Appearance"
        caption="Customize how your digital menu looks to your customers."
        actions={
          <Button type="button" className="rounded-full" onClick={save}>
            <Check className="h-4 w-4" />
            Save Appearance
          </Button>
        }
      />

      <Card className="rounded-card border-line shadow-card">
        <CardContent className="p-6">
          <h2 className="font-display text-base font-bold">Menu layout & theme</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the best design for your restaurant brand.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {themes.map((theme) => {
              const selected = appearance.themeId === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  disabled={theme.locked}
                  onClick={() => setTheme(theme.id as MenuThemeId)}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border-2 p-3 text-left transition-shadow',
                    selected
                      ? 'border-brand shadow-raised'
                      : 'border-line hover:border-ink-900/20',
                    theme.locked && 'opacity-60',
                  )}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                  <div
                    className={cn(
                      'mx-auto flex h-44 w-[9.5rem] flex-col rounded-[1.25rem] border p-3 shadow-card',
                      theme.preview,
                    )}
                  >
                    <div className="h-8 rounded-lg bg-black/10" />
                    <div className="mt-2 flex gap-1">
                      <span className="h-5 flex-1 rounded-full bg-black/10" />
                      <span className="h-5 flex-1 rounded-full bg-black/5" />
                    </div>
                    <div className="mt-3 flex-1 space-y-2">
                      <div className="h-10 rounded-lg bg-black/10" />
                      <div className="h-10 rounded-lg bg-black/5" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{theme.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{theme.blurb}</p>
                </button>
              )
            })}

            <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface-muted/50 p-6 text-center">
              <Lock className="h-8 w-8 text-warning" />
              <p className="mt-2 text-sm font-semibold">Unlock</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Extra themes on Enterprise
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
