import { apiRequest } from '@/lib/api-client'
import type { PlanId } from '@/lib/tenant'

export type BillingStatus = {
  configured: boolean
  keyId: string | null
  planId: PlanId
  status: string
  subscriptionStatus: string | null
  razorpaySubscriptionId: string | null
  razorpayCustomerId: string | null
}

export type SubscribeResult =
  | {
      mode: 'demo'
      planId: PlanId
      message: string
    }
  | {
      mode: 'razorpay'
      keyId: string
      subscriptionId: string
      planId: PlanId
      customerId: string
    }
  | {
      mode: 'razorpay_order'
      keyId: string
      orderId: string
      amount: number
      currency: string
      planId: PlanId
    }

export type GuestPayCreateResult =
  | {
      mode: 'demo'
      keyId: null
      razorpayOrderId: string
      amount: number
      currency: string
    }
  | {
      mode: 'razorpay'
      keyId: string
      razorpayOrderId: string
      amount: number
      currency: string
    }

export function apiBillingStatus(restaurantId: string) {
  return apiRequest<BillingStatus>(`/billing/status/${restaurantId}`)
}

export function apiStartSubscription(restaurantId: string, planId: PlanId) {
  return apiRequest<SubscribeResult>('/billing/subscribe', {
    body: { restaurantId, planId },
  })
}

export function apiConfirmSubscription(
  restaurantId: string,
  subscriptionId: string,
  paymentId?: string,
) {
  return apiRequest<BillingStatus>('/billing/confirm', {
    body: { restaurantId, subscriptionId, paymentId },
  })
}

export function apiConfirmOrderCheckout(input: {
  restaurantId: string
  planId: PlanId
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) {
  return apiRequest<BillingStatus>('/billing/confirm-order', { body: input })
}

export function apiCreateGuestPay(input: {
  restaurantId: string
  orderId: string
  amountPaise: number
}) {
  return apiRequest<GuestPayCreateResult>('/billing/pay/create', {
    auth: false,
    body: input,
  })
}

export function apiConfirmGuestPay(input: {
  restaurantId: string
  orderId: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  demo?: boolean
}) {
  return apiRequest('/billing/pay/confirm', {
    auth: false,
    body: input,
  })
}
