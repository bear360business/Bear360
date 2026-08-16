/** Persisted Super Admin settings (team, billing defaults, notification prefs). */

import { BRAND_DOMAIN, BRAND_NAME } from '@/lib/brand'

export const SUPER_SETTINGS_KEY = 'bearqr:super-settings'
export const SUPER_SETTINGS_EVENT = 'bearqr:super-settings'

export type SuperTeamRole = 'owner' | 'admin' | 'support'

export type SuperTeamMember = {
  id: string
  name: string
  email: string
  role: SuperTeamRole
}

export type SuperNotifPrefs = {
  'new-restaurant': boolean
  'trial-expiry': boolean
  'weekly-digest': boolean
  'billing-failures': boolean
}

export type SuperPlatformIdentity = {
  platformName: string
  supportEmail: string
  logoDataUrl?: string
}

export type SuperBillingDefaults = {
  trialDays: '7' | '14' | '30'
  currency: 'inr' | 'usd' | 'eur'
}

export type SuperSettings = {
  identity: SuperPlatformIdentity
  team: SuperTeamMember[]
  billing: SuperBillingDefaults
  notifications: SuperNotifPrefs
}

const DEFAULT_TEAM: SuperTeamMember[] = [
  { id: 'tm_anya', name: 'Anya A.', email: 'anya@bear360.app', role: 'owner' },
  { id: 'tm_sam', name: 'Sam Torres', email: 'sam@bear360.app', role: 'admin' },
  { id: 'tm_jin', name: 'Jin Park', email: 'jin@bear360.app', role: 'support' },
]

export const DEFAULT_SUPER_SETTINGS: SuperSettings = {
  identity: {
    platformName: BRAND_NAME,
    supportEmail: `support@${BRAND_DOMAIN}`,
  },
  team: DEFAULT_TEAM,
  billing: { trialDays: '14', currency: 'inr' },
  notifications: {
    'new-restaurant': true,
    'trial-expiry': true,
    'weekly-digest': false,
    'billing-failures': true,
  },
}

function notify() {
  try {
    window.dispatchEvent(new Event(SUPER_SETTINGS_EVENT))
  } catch {
    /* ignore */
  }
}

export function readSuperSettings(): SuperSettings {
  try {
    const raw = localStorage.getItem(SUPER_SETTINGS_KEY)
    if (!raw) return structuredClone(DEFAULT_SUPER_SETTINGS)
    const parsed = JSON.parse(raw) as Partial<SuperSettings>
    return {
      identity: { ...DEFAULT_SUPER_SETTINGS.identity, ...parsed.identity },
      team:
        Array.isArray(parsed.team) && parsed.team.length > 0
          ? parsed.team
          : structuredClone(DEFAULT_TEAM),
      billing: { ...DEFAULT_SUPER_SETTINGS.billing, ...parsed.billing },
      notifications: {
        ...DEFAULT_SUPER_SETTINGS.notifications,
        ...parsed.notifications,
      },
    }
  } catch {
    return structuredClone(DEFAULT_SUPER_SETTINGS)
  }
}

export function writeSuperSettings(next: SuperSettings) {
  try {
    localStorage.setItem(SUPER_SETTINGS_KEY, JSON.stringify(next))
    notify()
  } catch {
    /* ignore */
  }
}
