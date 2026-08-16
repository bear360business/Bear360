import type { GuestLocale } from './locales'
import { en, type MessageKey } from './messages/en'
import { hi } from './messages/hi'
import { ta } from './messages/ta'
import type { OrderType } from '@/lib/types'

const catalogs = { en, ta, hi } as const

export type { MessageKey, GuestLocale }
export { GUEST_LOCALES, LOCALE_META, isGuestLocale, normalizeEnabledLocales, normalizeDefaultLocale } from './locales'

export type TParams = Record<string, string | number>

export function t(key: MessageKey, locale: GuestLocale = 'en', params?: TParams): string {
  const catalog = catalogs[locale] ?? en
  let text = catalog[key] ?? en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v))
    }
  }
  return text
}

export function orderTypeLabel(type: OrderType, locale: GuestLocale): string {
  if (type === 'dine-in') return t('orderType.dineIn', locale)
  if (type === 'takeaway') return t('orderType.takeaway', locale)
  return t('orderType.delivery', locale)
}

export function orderTypeCaption(type: OrderType, locale: GuestLocale): string {
  if (type === 'dine-in') return t('orderType.dineInCaption', locale)
  if (type === 'takeaway') return t('orderType.takeawayCaption', locale)
  return t('orderType.deliveryCaption', locale)
}

export function localizedTrackerSteps(
  type: OrderType,
  locale: GuestLocale,
): { status: 'pending' | 'preparing' | 'served' | 'completed'; label: string }[] {
  return [
    { status: 'pending', label: t('tracker.placed', locale) },
    { status: 'preparing', label: t('tracker.preparing', locale) },
    {
      status: 'served',
      label:
        type === 'delivery'
          ? t('tracker.onTheWay', locale)
          : t('tracker.ready', locale),
    },
    {
      status: 'completed',
      label:
        type === 'delivery'
          ? t('tracker.delivered', locale)
          : type === 'takeaway'
            ? t('tracker.pickedUp', locale)
            : t('tracker.served', locale),
    },
  ]
}
