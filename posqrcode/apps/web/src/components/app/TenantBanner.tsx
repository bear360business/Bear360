import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, CreditCard, Lock } from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { cn } from '@/lib/utils'

/**
 * The one banner slot at the top of the admin content area (doc §5.4).
 * One banner maximum — status ranks above everything else.
 */
export function TenantBanner() {
  const { config } = useTenant()

  const banner = (() => {
    switch (config.status) {
      case 'trial':
        return {
          icon: Clock,
          tone: 'info' as const,
          text: `${config.trialDaysLeft} days left in your trial`,
          caption: 'Add a payment method to keep POS, Inventory and Staff after it ends.',
          cta: 'Choose a plan',
        }
      case 'past_due':
        return {
          icon: CreditCard,
          tone: 'warning' as const,
          text: 'Payment failed',
          caption: `Update your card before ${config.renewsOn} to avoid interruption.`,
          cta: 'Update payment',
        }
      case 'suspended':
        return {
          icon: Lock,
          tone: 'danger' as const,
          text: 'Account suspended — the app is read-only',
          caption: 'Your data is safe. Contact support to reactivate.',
          cta: 'Contact support',
          href: '/support',
        }
      case 'expired':
        return {
          icon: AlertTriangle,
          tone: 'danger' as const,
          text: 'Subscription ended — the app is read-only',
          caption: 'Reports and exports still work. Renew to start billing again.',
          cta: 'Renew plan',
        }
      default:
        return null
    }
  })()

  if (!banner) return null
  const Icon = banner.icon

  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center gap-3 rounded-card border px-4 py-3',
        banner.tone === 'info' && 'border-info/30 bg-info-tint',
        banner.tone === 'warning' && 'border-warning/30 bg-warning-tint',
        banner.tone === 'danger' && 'border-danger/30 bg-danger-tint',
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          banner.tone === 'info' && 'text-info',
          banner.tone === 'warning' && 'text-warning',
          banner.tone === 'danger' && 'text-danger',
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{banner.text}</p>
        <p className="text-xs text-muted-foreground">{banner.caption}</p>
      </div>
      <Link
        to={'href' in banner && banner.href ? banner.href : '/billing'}
        className="shrink-0 rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        {banner.cta}
      </Link>
    </div>
  )
}
