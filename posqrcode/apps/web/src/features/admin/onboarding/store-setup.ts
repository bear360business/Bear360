import type { IndustryId, PlanId } from '@/lib/types'

const PENDING_KEY = 'bearqr:store-setup-pending'
const DRAFT_KEY = 'bearqr:store-onboarding'

export type StoreOnboardingDraft = {
  email: string
  // Business
  businessName: string
  ownerName: string
  slug: string
  country: string
  currency: string
  description: string
  industryId: IndustryId
  // Contacts
  publicEmail: string
  phone: string
  whatsapp: string
  // Location
  address: string
  city: string
  mapsLink: string
  logoDataUrl?: string
  coverDataUrl?: string
  // Plan
  planId: PlanId
  step: number
}

export function isStoreSetupPending(): boolean {
  try {
    return (
      localStorage.getItem(PENDING_KEY) === '1' ||
      sessionStorage.getItem(PENDING_KEY) === '1'
    )
  } catch {
    return false
  }
}

export function markStoreSetupPending(email: string) {
  try {
    localStorage.setItem(PENDING_KEY, '1')
    sessionStorage.removeItem(PENDING_KEY)
    const existing = readOnboardingDraft()
    // Same email → keep wizard progress; new email → fresh draft.
    if (existing?.email?.toLowerCase() === email.toLowerCase()) {
      writeOnboardingDraft({ ...existing, email, publicEmail: existing.publicEmail || email })
    } else {
      writeOnboardingDraft(emptyDraft(email))
    }
  } catch {
    /* ignore */
  }
}

export function clearStoreSetupPending() {
  try {
    localStorage.removeItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    localStorage.removeItem(DRAFT_KEY)
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export function emptyDraft(email = ''): StoreOnboardingDraft {
  return {
    email,
    businessName: '',
    ownerName: '',
    slug: '',
    country: 'India',
    currency: 'INR',
    description: '',
    industryId: 'restaurants',
    publicEmail: email,
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    mapsLink: '',
    planId: 'basic',
    step: 0,
  }
}

export function readOnboardingDraft(): StoreOnboardingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY) ?? sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return { ...emptyDraft(), ...(JSON.parse(raw) as StoreOnboardingDraft) }
  } catch {
    return null
  }
}

export function writeOnboardingDraft(draft: StoreOnboardingDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export const ONBOARDING_STEPS = [
  { id: 'business', label: 'Business' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'location', label: 'Location' },
  { id: 'plan', label: 'Choose plan' },
] as const

/** Marketing plan cards for onboarding (maps to tenant PlanId). */
export const ONBOARDING_PLANS: {
  id: PlanId
  name: string
  priceYear: number
  strikeYear?: number
  saveLabel?: string
  blurb?: string
  features: string[]
}[] = [
  {
    id: 'basic',
    name: 'Free',
    priceYear: 0,
    blurb:
      'Try premium features at no cost with a 7-day free trial. Explore and experience the complete system before subscribing.',
    features: ['7-day full trial', 'QR menu', 'Tables & spaces', 'Starter reports'],
  },
  {
    id: 'professional',
    name: 'Lite',
    priceYear: 1499,
    strikeYear: 2388,
    saveLabel: 'SAVE 37%',
    features: [
      '150 menu items',
      'POS + kitchen display',
      'WhatsApp-style ordering',
      'Discount options',
      'QR customization',
      '3 themes',
      'Drag & drop menu',
      'Inventory basics',
    ],
  },
  {
    id: 'enterprise',
    name: 'Premium',
    priceYear: 2499,
    strikeYear: 3000,
    saveLabel: 'SAVE 17%',
    features: [
      '400 items',
      'WhatsApp-style ordering',
      'Offer banner',
      'Discount options',
      'QR customization',
      '4 themes',
      'Multi-branch ready',
      'Advanced reports',
      'Priority support',
    ],
  },
]
