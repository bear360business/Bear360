import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Check, ChevronDown, ReceiptText } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useGuestLocale } from '@/hooks/use-guest-locale'
import { useOrders } from '@/hooks/use-orders'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { inr } from '@/lib/currency'
import { localizedTrackerSteps } from '@/lib/i18n'
import { apiPublicTrackOrder, subscribeGuestOrder } from '@/lib/api-orders'
import { trackerIndex } from '@/lib/order-flow'
import { useMockData } from '@/lib/runtime-config'
import type { OrderStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useGuestVenue } from '@/hooks/use-guest-venue'
import { readPlacedOrder } from '../last-order'
import { customerBase } from '../routes'

/** Order success: token card + live tracker + summary (doc §6.18). */
export function SuccessPage() {
  const { restaurantId = '', tableId = '' } = useParams()
  const mock = useMockData()
  const { table } = useGuestVenue(restaurantId, tableId)
  const order = useMemo(() => readPlacedOrder(restaurantId, tableId), [restaurantId, tableId])
  const { config } = usePlatformConfig()
  const { getById } = useOrders()
  const { locale, t } = useGuestLocale()
  const showTracker = config.customerUi.showLiveTracking
  const [now, setNow] = useState(() => Date.now())
  const [trackedStatus, setTrackedStatus] = useState<OrderStatus | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (mock || !order?.orderId || !restaurantId) return
    let cancelled = false

    const applyStatus = (status: string) => {
      const s =
        status === 'paid' ? 'completed' : status === 'void' ? 'cancelled' : status
      setTrackedStatus(s as OrderStatus)
    }

    // Live socket (order-scoped room) + light poll fallback.
    const unsub = subscribeGuestOrder(restaurantId, order.orderId, (liveOrder) => {
      if (!cancelled) applyStatus(liveOrder.status)
    })

    const poll = async () => {
      try {
        const row = await apiPublicTrackOrder(restaurantId, order.orderId)
        if (cancelled || !row?.status) return
        applyStatus(row.status)
      } catch {
        /* keep last known */
      }
    }
    void poll()
    const interval = window.setInterval(() => void poll(), 20_000)

    return () => {
      cancelled = true
      unsub()
      window.clearInterval(interval)
    }
  }, [mock, order?.orderId, restaurantId])

  const live = order?.orderId ? getById(order.orderId) : undefined
  const base = customerBase(restaurantId, tableId)

  if (!order) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <EmptyState
          icon={ReceiptText}
          title={t('success.notFound')}
          description={t('success.notFoundDesc')}
          action={
            <Link
              to={`${base}/menu`}
              className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
            >
              {t('success.backToMenu')}
            </Link>
          }
        />
      </div>
    )
  }

  const placedMs = new Date(order.placedAt).getTime()
  const elapsedMin = Math.max(0, Math.floor((now - placedMs) / 60_000))
  const orderType = order.orderType ?? 'dine-in'
  const status = trackedStatus ?? live?.status ?? 'pending'
  const cancelled = status === 'cancelled'
  const steps = localizedTrackerSteps(orderType, locale)
  const activeStep = trackerIndex(status)
  const isReady = activeStep === 2
  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0)
  const readyBanner =
    orderType === 'delivery'
      ? t('success.readyDelivery')
      : orderType === 'takeaway'
        ? t('success.readyPickup')
        : t('success.readyDineIn')
  const typeLabel =
    orderType === 'dine-in'
      ? t('success.dineIn')
      : orderType === 'takeaway'
        ? t('success.takeaway')
        : t('success.delivery')

  return (
    <div className="flex flex-col items-center p-4 pb-8 pt-12">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-white animate-in zoom-in-50 duration-500 motion-reduce:animate-none">
        <Check className="h-8 w-8" strokeWidth={3} />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold">{t('success.title')}</h1>
      <p className="mt-1 text-base text-muted-foreground">{t('success.showToken')}</p>

      <div className="mt-6 w-full rounded-hero bg-brand-tint p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t('success.token')}
        </p>
        <p className="mt-1 font-display text-5xl font-bold text-foreground">{order.token}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {orderType === 'dine-in'
            ? `${table ? t('landing.table', { n: table.number }) : t('success.yourTable')} · ${t('success.orderNum', { n: order.number })}`
            : `${typeLabel} · ${t('success.orderNum', { n: order.number })}`}
        </p>
        {order.deliveryAddress && (
          <p className="mt-1 truncate text-xs text-muted-foreground">📍 {order.deliveryAddress}</p>
        )}
      </div>

      {cancelled && (
        <div className="mt-4 w-full rounded-xl bg-danger-tint px-4 py-3 text-center text-sm font-semibold text-danger">
          {t('success.cancelled')}
        </div>
      )}

      {showTracker && isReady && !cancelled && (
        <div className="mt-4 w-full rounded-xl bg-success-tint px-4 py-3 text-center text-sm font-semibold text-success animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none">
          {readyBanner}
        </div>
      )}

      {showTracker && !cancelled && (
        <div className="mt-4 w-full rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="text-sm font-semibold">{t('success.liveStatus')}</h2>
          <div className="mt-4 flex items-center">
            {steps.map((_, i) => (
              <div key={i} className={cn('flex items-center', i > 0 && 'flex-1')}>
                {i > 0 && (
                  <span
                    className={cn(
                      'h-0.5 flex-1',
                      i <= activeStep ? 'bg-success' : 'bg-surface-muted',
                    )}
                  />
                )}
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                    i < activeStep
                      ? 'bg-success text-white'
                      : i === activeStep
                        ? 'bg-brand motion-safe:animate-pulse'
                        : 'bg-surface-muted',
                  )}
                >
                  {i < activeStep && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-center">
            {steps.map((step, i) => (
              <div
                key={step.label}
                className={cn('text-xs', i === 0 && 'text-left', i === 3 && 'text-right')}
              >
                <p
                  className={cn(
                    'font-medium',
                    i <= activeStep ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                <p className="text-muted-foreground">
                  {i === 0
                    ? format(new Date(placedMs), 'h:mm a')
                    : i === activeStep
                      ? t('success.now')
                      : i < activeStep
                        ? '✓'
                        : '—'}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {activeStep < 2
              ? elapsedMin < 1
                ? t('success.placedJustNow')
                : t('success.placedAgo', { n: elapsedMin })
              : activeStep === 2
                ? orderType === 'delivery'
                  ? t('success.riderOnWay')
                  : orderType === 'takeaway'
                    ? t('success.showTokenCounter')
                    : t('success.pickupOrWait')
                : t('success.enjoy')}
          </p>
        </div>
      )}

      <Collapsible className="mt-4 w-full rounded-card border border-line bg-surface shadow-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-sm [&[data-state=open]>svg]:rotate-180">
          <span className="font-semibold">
            {itemCount === 1
              ? t('success.items', { n: itemCount })
              : t('success.itemsPlural', { n: itemCount })}{' '}
            · {inr(order.total)}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="space-y-1.5 border-t border-line p-4 text-sm">
            {order.items.map((item) => (
              <li key={item.menuItemId} className="flex justify-between">
                <span>
                  {item.qty}× {item.name}
                </span>
                <span className="text-muted-foreground">{inr(item.price * item.qty)}</span>
              </li>
            ))}
            {order.deliveryFee > 0 && (
              <li className="flex justify-between text-muted-foreground">
                <span>{t('cart.deliveryFee')}</span>
                <span>{inr(order.deliveryFee)}</span>
              </li>
            )}
            {order.note && (
              <li className="pt-1 text-xs italic text-muted-foreground">📝 {order.note}</li>
            )}
          </ul>
        </CollapsibleContent>
      </Collapsible>

      <Link
        to={`${base}/menu`}
        className="mt-6 inline-flex h-11 items-center rounded-full border-2 border-line px-6 text-sm font-semibold transition-colors hover:bg-surface-muted"
      >
        {t('success.orderMore')}
      </Link>
    </div>
  )
}
