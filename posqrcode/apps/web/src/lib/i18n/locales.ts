export const GUEST_LOCALES = ['en', 'ta', 'hi'] as const
export type GuestLocale = (typeof GUEST_LOCALES)[number]

export const LOCALE_META: Record<
  GuestLocale,
  { label: string; nativeLabel: string; htmlLang: string }
> = {
  en: { label: 'English', nativeLabel: 'English', htmlLang: 'en' },
  ta: { label: 'Tamil', nativeLabel: 'தமிழ்', htmlLang: 'ta' },
  hi: { label: 'Hindi', nativeLabel: 'हिन्दी', htmlLang: 'hi' },
}

export function isGuestLocale(value: unknown): value is GuestLocale {
  return value === 'en' || value === 'ta' || value === 'hi'
}

export function normalizeEnabledLocales(raw: unknown): GuestLocale[] {
  if (!Array.isArray(raw)) return [...GUEST_LOCALES]
  const next = raw.filter(isGuestLocale)
  return next.length > 0 ? next : ['en']
}

export function normalizeDefaultLocale(
  raw: unknown,
  enabled: GuestLocale[],
): GuestLocale {
  if (isGuestLocale(raw) && enabled.includes(raw)) return raw
  return enabled[0] ?? 'en'
}
