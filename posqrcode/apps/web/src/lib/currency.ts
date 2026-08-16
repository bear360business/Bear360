// Money formatting — defaults to INR (en-IN). Pass venue.currency for AED/SGD/etc.

const formatterCache = new Map<string, { whole: Intl.NumberFormat; frac: Intl.NumberFormat }>()

function formatters(currency: string) {
  const code = (currency || 'INR').toUpperCase()
  let hit = formatterCache.get(code)
  if (!hit) {
    const locale = code === 'INR' ? 'en-IN' : 'en'
    hit = {
      whole: new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0,
      }),
      frac: new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    }
    formatterCache.set(code, hit)
  }
  return hit
}

/** Format money; defaults to INR. Use venue.currency on guest surfaces. */
export function money(amount: number, currency = 'INR'): string {
  const rounded = Math.round(amount * 100) / 100
  const f = formatters(currency)
  return Number.isInteger(rounded) ? f.whole.format(rounded) : f.frac.format(rounded)
}

/** ₹1,234 for whole rupees, ₹1,234.50 when paise are present. */
export function inr(amount: number, currency = 'INR'): string {
  return money(amount, currency)
}

/** Compact axis/tick labels: ₹1.2Cr · ₹3.4L · ₹45k · ₹850 (Indian units). */
export function formatCompactInr(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`
  if (abs >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`
  if (abs >= 1_000) return `₹${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return `₹${Math.round(amount)}`
}
