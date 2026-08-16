import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, ShoppingBag } from 'lucide-react'
import { EmptyState } from '@/components/app/EmptyState'
import { QuantityStepper } from '@/components/app/QuantityStepper'
import { TableChip } from '@/components/app/TableChip'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCart, type CartItem } from '@/hooks/use-cart'
import { useGuestLocale } from '@/hooks/use-guest-locale'
import { useGuestVenue } from '@/hooks/use-guest-venue'
import { useOrders } from '@/hooks/use-orders'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { getVenueOps } from '@/hooks/use-venue-ops'
import { inr } from '@/lib/currency'
import { orderTypeCaption, orderTypeLabel } from '@/lib/i18n'
import { startGuestOrderPayment } from '@/lib/razorpay-checkout'
import { useMockData } from '@/lib/runtime-config'
import { ORDER_TYPE_META } from '@/lib/service-config'
import { cn } from '@/lib/utils'
import { savePlacedOrder } from '../last-order'
import { customerBase } from '../routes'

type PayMethod = 'pay-at-counter' | 'online'

/** Cart & checkout: order type, steppers, notes, bill summary, sticky CTA (doc §6.17). */
export function CartPage() {
  const { restaurantId = '', tableId = '' } = useParams()
  const navigate = useNavigate()
  const { restaurant, table } = useGuestVenue(restaurantId, tableId)
  const gstin = restaurant?.gstin
  const cart = useCart()
  const ops = getVenueOps()
  const { locale, t } = useGuestLocale()
  const [placing, setPlacing] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const { config } = usePlatformConfig()
  const { placeOrder: createOrder } = useOrders()
  const mock = useMockData()

  const orderTypeOptions = ORDER_TYPE_META.filter((entry) =>
    cart.availableOrderTypes.includes(entry.id),
  )
  const canPlace = config.service.onlineOrdering && orderTypeOptions.length > 0 && !ops.catalogueMode

  const phoneRequired = ops.customerLogin || ops.customerPhone === 'required'
  const showPhone = ops.customerLogin || ops.customerPhone !== 'hidden'
  const showName = ops.customerName !== 'hidden'

  const payOptions = useMemo(() => {
    const opts: { id: PayMethod; label: string }[] = []
    const cashOk =
      ops.cashOnDelivery &&
      ((cart.orderType === 'dine-in' && ops.cashDineIn) ||
        (cart.orderType === 'takeaway' && ops.cashPickup) ||
        cart.orderType === 'delivery')
    if (cashOk) opts.push({ id: 'pay-at-counter', label: t('cart.payCounter') })
    if (ops.onlinePayments) opts.push({ id: 'online', label: t('cart.payOnline') })
    return opts
  }, [ops, cart.orderType, t])

  const [payMethod, setPayMethod] = useState<PayMethod | null>(null)
  const selectedPay =
    payMethod && payOptions.some((p) => p.id === payMethod)
      ? payMethod
      : (payOptions[0]?.id ?? null)

  const roomServiceLabel =
    ops.roomService && table && cart.orderType === 'dine-in'
      ? t('cart.room', { n: table.number })
      : null

  const base = customerBase(restaurantId, tableId)

  const changeQty = (item: CartItem, qty: number) => {
    cart.setQty(item.menuItemId, qty)
    if (qty <= 0) {
      toast(t('cart.toast.removed', { name: item.name }), {
        action: {
          label: t('cart.toast.undo'),
          onClick: () => {
            cart.addItem({
              id: item.menuItemId,
              name: item.name,
              price: item.price,
              image: item.image ?? '',
            })
            cart.setQty(item.menuItemId, item.qty)
          },
        },
      })
    }
  }

  const placeOrder = () => {
    if (showName && ops.customerName === 'required' && !guestName.trim()) {
      toast.error(t('cart.toast.nameRequired'))
      return
    }
    if (showPhone && phoneRequired && guestPhone.replace(/\D/g, '').length < 10) {
      toast.error(
        ops.customerLogin ? t('cart.toast.phoneLogin') : t('cart.toast.phoneInvalid'),
      )
      return
    }
    if (payOptions.length === 0) {
      toast.error(t('cart.toast.paymentsDisabled'))
      return
    }
    if (!selectedPay) {
      toast.error(t('cart.toast.choosePay'))
      return
    }
    if (placing) return
    setPlacing(true)

    const phoneDigits = guestPhone.replace(/\D/g, '')
    const noteParts = [
      cart.note && ops.specialInstructions ? cart.note : '',
      ops.roomService && table ? 'Room service' : '',
    ].filter(Boolean)

    void (async () => {
      try {
        const dineInAtTable = cart.orderType === 'dine-in' && table
        const fromCounterQr = !tableId
        const created = await createOrder({
          restaurantId,
          items: cart.items.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.name,
            qty: i.qty,
            price: i.price,
          })),
          orderType: cart.orderType,
          channel: 'qr',
          origin: dineInAtTable ? 'table-qr' : 'counter-qr',
          ...(dineInAtTable
            ? {
                tableId: table.id,
                tableName: roomServiceLabel ?? `Table ${table.number}`,
              }
            : {
                tableName:
                  cart.orderType === 'delivery'
                    ? 'Delivery'
                    : cart.orderType === 'takeaway'
                      ? fromCounterQr
                        ? 'Counter · Takeaway'
                        : `Takeaway (from T-${table?.number ?? '?'})`
                      : 'Counter',
              }),
          ...(guestName.trim() ? { customerName: guestName.trim() } : {}),
          ...(phoneDigits ? { customerPhone: phoneDigits } : {}),
          paymentMethod: selectedPay,
          // Online: create unpaid first, then Razorpay (or demo confirm). Counter: unpaid.
          paid: false,
          ...(noteParts.length ? { note: noteParts.join(' · ') } : {}),
          ...(cart.orderType === 'delivery' && deliveryAddress.trim()
            ? { deliveryAddress: deliveryAddress.trim() }
            : {}),
          gstRatePct: cart.gstRatePct,
          deliveryFee: cart.deliveryFee,
          parcelFee: cart.parcelFee,
        })

        let payLabel =
          selectedPay === 'online' ? 'Payment: online' : 'Payment: pay at counter'

        if (selectedPay === 'online') {
          if (mock) {
            payLabel = 'Payment: online (mock)'
          } else {
            const pay = await startGuestOrderPayment({
              restaurantId,
              orderId: created.id,
              amountInr: created.total,
              description: `Order ${created.token}`,
            })
            payLabel =
              pay.mode === 'demo'
                ? 'Payment: online (demo — add RAZORPAY keys for live)'
                : 'Payment: online (paid)'
          }
        }

        if (ops.whatsappCheckout) {
          const lines = [
            `Order ${created.token} · ${restaurant?.name ?? 'Restaurant'}`,
            ...cart.items.map((i) => `${i.qty}× ${i.name}`),
            `Total ${inr(cart.total, restaurant?.currency)}`,
            payLabel,
          ]
          const waDigits = (restaurant?.whatsapp || restaurant?.phone || '').replace(/\D/g, '')
          const waPath = waDigits ? `${waDigits}` : ''
          const wa = `https://wa.me/${waPath}?text=${encodeURIComponent(lines.join('\n'))}`
          window.open(wa, '_blank', 'noopener,noreferrer')
        }

        savePlacedOrder(restaurantId, tableId, {
          orderId: created.id,
          number: created.number,
          token: created.token,
          orderType: cart.orderType,
          items: cart.items,
          note: cart.note,
          ...(cart.orderType === 'delivery' && deliveryAddress.trim()
            ? { deliveryAddress: deliveryAddress.trim() }
            : {}),
          subtotal: cart.subtotal,
          deliveryFee: cart.deliveryFee,
          cgst: cart.cgst,
          sgst: cart.sgst,
          total: cart.total,
          placedAt: created.placedAt,
        })
        cart.clear()
        navigate(`${base}/success`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not place order')
        setPlacing(false)
      }
    })()
  }

  const chipLabel =
    roomServiceLabel ??
    (cart.orderType === 'dine-in' && table
      ? t('landing.table', { n: table.number })
      : cart.orderType === 'delivery'
        ? t('cart.chipDelivery')
        : table
          ? t('cart.chipTakeawayTable', { n: table.number })
          : t('cart.chipCounterTakeaway'))

  const typeHint =
    cart.orderType === 'dine-in' && table
      ? t('cart.servedAtTable', { n: table.number })
      : cart.orderType === 'takeaway' && table
        ? t('cart.pickupNotBilled', { n: table.number })
        : cart.orderType === 'takeaway'
          ? t('cart.counterPickup')
          : orderTypeCaption(cart.orderType, locale)

  return (
    <div className="flex min-h-full flex-col pb-4">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
        <Link
          to={`${base}/menu`}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label={t('success.backToMenu')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-base font-semibold">{t('cart.title')}</h1>
        <TableChip label={chipLabel} />
      </header>

      {cart.items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={ShoppingBag}
            title={t('cart.empty')}
            description={t('cart.emptyDesc')}
            action={
              <Link
                to={`${base}/menu`}
                className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
              >
                {t('cart.browseMenu')}
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="space-y-4 p-4">
            {orderTypeOptions.length > 0 && (
              <div
                className={cn(
                  'grid gap-2',
                  orderTypeOptions.length === 1
                    ? 'grid-cols-1'
                    : orderTypeOptions.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3',
                )}
              >
                {orderTypeOptions.map((type) => {
                  const active = cart.orderType === type.id
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => cart.setOrderType(type.id)}
                      className={cn(
                        'flex flex-col items-center rounded-2xl border-2 px-2 py-3 transition-colors',
                        active
                          ? 'border-brand bg-brand-tint'
                          : 'border-line bg-surface hover:border-ink-900/20',
                      )}
                    >
                      <span className="text-xl" aria-hidden>
                        {type.emoji}
                      </span>
                      <span className={cn('mt-1 text-xs', active ? 'font-semibold' : 'font-medium')}>
                        {orderTypeLabel(type.id, locale)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">{typeHint}</p>

            {cart.orderType === 'delivery' && (
              <div className="rounded-card border border-line bg-surface p-4 shadow-card">
                <label htmlFor="delivery-address" className="mb-2 block text-sm font-semibold">
                  🛵 {t('cart.deliveryAddress')}
                </label>
                <Textarea
                  id="delivery-address"
                  rows={2}
                  placeholder={t('cart.deliveryPlaceholder')}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
            )}

            <div className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
              {cart.items.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-3 p-4">
                  {item.image && (
                    <img
                      src={item.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</p>
                  <QuantityStepper
                    value={item.qty}
                    onChange={(qty) => changeQty(item, qty)}
                    size="sm"
                  />
                  <p className="w-16 text-right text-sm font-semibold">
                    {inr(item.price * item.qty)}
                  </p>
                </div>
              ))}
            </div>

            <Link
              to={`${base}/menu`}
              className="inline-block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('cart.addMore')}
            </Link>

            {(showName || showPhone) && (
              <div className="space-y-3 rounded-card border border-line bg-surface p-4 shadow-card">
                <p className="text-sm font-semibold">
                  {ops.customerLogin ? t('cart.signInPhone') : t('cart.yourDetails')}
                </p>
                {showName && (
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={
                      ops.customerName === 'required'
                        ? t('cart.nameRequired')
                        : t('cart.nameOptional')
                    }
                  />
                )}
                {showPhone && (
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder={phoneRequired ? t('cart.phoneRequired') : t('cart.phoneOptional')}
                  />
                )}
              </div>
            )}

            {ops.specialInstructions && (
              <div className="rounded-card border border-line bg-surface p-4 shadow-card">
                <label htmlFor="order-note" className="mb-2 block text-sm font-semibold">
                  📝 {t('cart.notes')}
                </label>
                <Textarea
                  id="order-note"
                  rows={2}
                  placeholder={t('cart.notesPlaceholder')}
                  value={cart.note}
                  onChange={(e) => cart.setNote(e.target.value)}
                />
              </div>
            )}

            {payOptions.length > 0 && (
              <div className="space-y-2 rounded-card border border-line bg-surface p-4 shadow-card">
                <p className="text-sm font-semibold">{t('cart.payment')}</p>
                <div className="grid gap-2">
                  {payOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPayMethod(p.id)}
                      className={cn(
                        'rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors',
                        selectedPay === p.id
                          ? 'border-brand bg-brand-tint'
                          : 'border-line hover:border-ink-900/20',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-card border border-line bg-surface p-4 shadow-card">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('cart.subtotal')}</dt>
                  <dd>{inr(cart.subtotal)}</dd>
                </div>
                {cart.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('cart.deliveryFee')}</dt>
                    <dd>{inr(cart.deliveryFee)}</dd>
                  </div>
                )}
                {cart.parcelFee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('cart.packaging')}</dt>
                    <dd>{inr(cart.parcelFee)}</dd>
                  </div>
                )}
                {cart.gstRatePct > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">CGST ({cart.cgstPct}%)</dt>
                      <dd>{inr(cart.cgst)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">SGST ({cart.sgstPct}%)</dt>
                      <dd>{inr(cart.sgst)}</dd>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <dt>{t('cart.tax')}</dt>
                    <dd>{t('cart.taxNotApplied')}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                  <dt>{t('cart.total')}</dt>
                  <dd>{inr(cart.total)}</dd>
                </div>
              </dl>
              {gstin && cart.gstRatePct > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  GST {cart.gstRatePct}% · GSTIN {gstin}
                </p>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 mt-auto bg-gradient-to-t from-surface-page via-surface-page px-4 pb-3 pt-4">
            {canPlace ? (
              <button
                type="button"
                disabled={
                  placing ||
                  payOptions.length === 0 ||
                  (cart.orderType === 'delivery' && deliveryAddress.trim() === '')
                }
                onClick={placeOrder}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-brand text-base font-semibold text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-70"
              >
                {placing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> {t('cart.placing')}
                  </>
                ) : cart.orderType === 'delivery' && deliveryAddress.trim() === '' ? (
                  <>{t('cart.addAddress')}</>
                ) : payOptions.length === 0 ? (
                  <>{t('cart.paymentsUnavailable')}</>
                ) : ops.whatsappCheckout ? (
                  <>{t('cart.orderWhatsapp', { total: inr(cart.total) })}</>
                ) : (
                  <>{t('cart.placeOrder', { total: inr(cart.total) })}</>
                )}
              </button>
            ) : (
              <p className="flex h-[52px] items-center justify-center rounded-full bg-warning-tint text-sm font-semibold text-warning">
                {ops.catalogueMode ? t('cart.catalogueOff') : t('cart.orderingPaused')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
