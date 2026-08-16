import type { VenueOps } from '@/hooks/use-venue-ops'
import { VENUE_OPS_EVENT, VENUE_OPS_KEY } from '@/hooks/use-venue-ops'
import {
  GUEST_LOCALES,
  normalizeDefaultLocale,
  normalizeEnabledLocales,
  type GuestLocale,
} from '@/lib/i18n'
import { applyMenuAppearanceFromSettings } from '@/hooks/use-menu-appearance'
import {
  DEFAULT_SERVICE_CONFIG,
  SERVICE_CONFIG_STORAGE_KEY,
  type ServiceConfig,
} from '@/lib/service-config'
import { writeVenueScoped } from '@/lib/venue-scope'

/** Apply tenant.settings from API into local venue-scoped caches. */
export function hydrateFromTenantSettings(
  venueId: string,
  settings: Record<string, unknown> | undefined | null,
) {
  if (!settings || !venueId) return

  const venueOpsRaw = (settings.venueOps ?? {}) as Partial<VenueOps>
  const enabledLocales = normalizeEnabledLocales(
    (venueOpsRaw.enabledLocales as GuestLocale[] | undefined) ??
      (settings.enabledLocales as GuestLocale[] | undefined) ??
      [...GUEST_LOCALES],
  )
  const ops: VenueOps = {
    parcelCharge: Number(venueOpsRaw.parcelCharge ?? 0),
    whatsappCheckout: Boolean(venueOpsRaw.whatsappCheckout),
    roomService: Boolean(venueOpsRaw.roomService),
    onlinePayments: Boolean(venueOpsRaw.onlinePayments),
    cashOnDelivery: venueOpsRaw.cashOnDelivery ?? true,
    cashDineIn: venueOpsRaw.cashDineIn ?? true,
    cashPickup: venueOpsRaw.cashPickup ?? true,
    taxEnabled: venueOpsRaw.taxEnabled ?? true,
    customerName: venueOpsRaw.customerName ?? 'required',
    customerPhone: venueOpsRaw.customerPhone ?? 'required',
    specialInstructions: venueOpsRaw.specialInstructions ?? true,
    catalogueMode: Boolean(venueOpsRaw.catalogueMode),
    customerLogin: Boolean(venueOpsRaw.customerLogin),
    enabledLocales,
    defaultLocale: normalizeDefaultLocale(
      (venueOpsRaw.defaultLocale as GuestLocale | undefined) ??
        (settings.defaultLocale as GuestLocale | undefined),
      enabledLocales,
    ),
  }
  writeVenueScoped(VENUE_OPS_KEY, venueId, ops)
  try {
    window.dispatchEvent(new Event(VENUE_OPS_EVENT))
  } catch {
    /* ignore */
  }

  const scRaw = (settings.serviceConfig ?? {}) as Partial<ServiceConfig>
  const orderTypes = {
    ...DEFAULT_SERVICE_CONFIG.orderTypes,
    ...((settings.orderTypes as ServiceConfig['orderTypes'] | undefined) ?? {}),
    ...(scRaw.orderTypes ?? {}),
  }
  const service: ServiceConfig = {
    ...DEFAULT_SERVICE_CONFIG,
    ...scRaw,
    orderTypes,
    counterOrdering:
      scRaw.counterOrdering ??
      (typeof settings.counterOrdering === 'boolean'
        ? settings.counterOrdering
        : DEFAULT_SERVICE_CONFIG.counterOrdering),
    deliveryFee:
      scRaw.deliveryFee ??
      (typeof settings.deliveryFee === 'number'
        ? settings.deliveryFee
        : DEFAULT_SERVICE_CONFIG.deliveryFee),
    deductStockOnPaid:
      scRaw.deductStockOnPaid ?? DEFAULT_SERVICE_CONFIG.deductStockOnPaid,
  }
  writeVenueScoped(SERVICE_CONFIG_STORAGE_KEY, venueId, service)
  try {
    window.dispatchEvent(new Event('bearqr:service-config-changed'))
  } catch {
    /* ignore */
  }

  applyMenuAppearanceFromSettings(venueId, settings)
}
