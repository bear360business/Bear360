import type { PlanId } from '@/lib/tenant'
import {
  apiConfirmGuestPay,
  apiConfirmOrderCheckout,
  apiConfirmSubscription,
  apiCreateGuestPay,
  apiStartSubscription,
  type SubscribeResult,
} from '@/lib/api-billing'
import { useMockData } from '@/lib/runtime-config'

type RazorpayHandlerResponse = {
  razorpay_payment_id: string
  razorpay_subscription_id?: string
  razorpay_order_id?: string
  razorpay_signature: string
}

type RazorpayCheckoutOptions = {
  key: string
  subscription_id?: string
  customer_id?: string
  order_id?: string
  amount?: number
  currency?: string
  name: string
  description: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  handler: (response: RazorpayHandlerResponse) => void
  modal?: { ondismiss?: () => void }
  theme?: { color?: string }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void }
  }
}

let scriptPromise: Promise<void> | null = null

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('Failed to load Razorpay Checkout'))
    }
    document.body.appendChild(s)
  })
  return scriptPromise
}

export async function startPlanCheckout(input: {
  restaurantId: string
  planId: PlanId
  planName: string
  mock?: boolean
  prefill?: { name?: string; email?: string; contact?: string }
  onDemoApplied?: (planId: PlanId) => void
  onActivated?: (planId: PlanId) => void
}): Promise<SubscribeResult> {
  if (input.mock) {
    input.onDemoApplied?.(input.planId)
    return { mode: 'demo', planId: input.planId, message: 'Mock mode' }
  }

  const result = await apiStartSubscription(input.restaurantId, input.planId)
  if (result.mode === 'demo') {
    input.onDemoApplied?.(result.planId)
    return result
  }

  await loadRazorpayScript()
  if (!window.Razorpay) throw new Error('Razorpay Checkout unavailable')

  // One-time Order mode (RAZORPAY_USE_ORDERS=true on backend) — any card works.
  if (result.mode === 'razorpay_order') {
    await new Promise<void>((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: result.keyId,
        order_id: result.orderId,
        amount: result.amount,
        currency: result.currency,
        name: 'Bear 360',
        description: `${input.planName} plan activation`,
        prefill: input.prefill,
        theme: { color: '#2F6FED' },
        handler: (response) => {
          void apiConfirmOrderCheckout({
            restaurantId: input.restaurantId,
            planId: result.planId,
            razorpayOrderId: response.razorpay_order_id || result.orderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              input.onActivated?.(result.planId)
              resolve()
            })
            .catch((err) => reject(err instanceof Error ? err : new Error('Confirm failed')))
        },
        modal: {
          ondismiss: () => reject(new Error('Checkout closed')),
        },
      })
      rzp.open()
    })
    return result
  }

  // Subscription mode.
  await new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: result.keyId,
      subscription_id: result.subscriptionId,
      name: 'Bear 360',
      description: `${input.planName} subscription`,
      prefill: input.prefill,
      theme: { color: '#2F6FED' },
      handler: (response) => {
        void apiConfirmSubscription(
          input.restaurantId,
          response.razorpay_subscription_id || result.subscriptionId,
          response.razorpay_payment_id,
        )
          .then(() => {
            input.onActivated?.(result.planId)
            resolve()
          })
          .catch((err) => reject(err instanceof Error ? err : new Error('Confirm failed')))
      },
      modal: {
        ondismiss: () => reject(new Error('Checkout closed')),
      },
    })
    rzp.open()
  })

  return result
}

/** One-time Razorpay order for guest cart — demo mode when keys missing. */
export async function startGuestOrderPayment(input: {
  restaurantId: string
  orderId: string
  amountInr: number
  description?: string
}): Promise<{ mode: 'demo' | 'razorpay' }> {
  const amountPaise = Math.round(input.amountInr * 100)
  const created = await apiCreateGuestPay({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
    amountPaise,
  })

  if (created.mode === 'demo') {
    await apiConfirmGuestPay({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      demo: true,
    })
    return { mode: 'demo' }
  }

  await loadRazorpayScript()
  if (!window.Razorpay) throw new Error('Razorpay Checkout unavailable')

  await new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: created.keyId,
      order_id: created.razorpayOrderId,
      amount: created.amount,
      currency: created.currency || 'INR',
      name: 'Bear 360',
      description: input.description ?? 'Order payment',
      theme: { color: '#2F6FED' },
      handler: (response) => {
        void apiConfirmGuestPay({
          restaurantId: input.restaurantId,
          orderId: input.orderId,
          razorpayOrderId: response.razorpay_order_id || created.razorpayOrderId,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
          .then(() => resolve())
          .catch((err) => reject(err instanceof Error ? err : new Error('Confirm failed')))
      },
      modal: {
        ondismiss: () => reject(new Error('Checkout closed')),
      },
    })
    rzp.open()
  })

  return { mode: 'razorpay' }
}

/** Hook-friendly helper that respects VITE_USE_MOCK. */
export function usePlanCheckout() {
  const mock = useMockData()
  return {
    mock,
    start: (args: Omit<Parameters<typeof startPlanCheckout>[0], 'mock'>) =>
      startPlanCheckout({ ...args, mock }),
  }
}
