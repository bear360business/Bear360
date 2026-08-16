// Indian restaurant GST — SINGLE SOURCE OF TRUTH for tax math.
// Restaurant service attracts GST split equally into CGST (central) + SGST (state):
//   · 5% (2.5 + 2.5) — standalone restaurants, no input tax credit (the default)
//   · 18% (9 + 9)    — restaurants inside hotels with room tariff ≥ ₹7,500
// Bills must always show the CGST/SGST split, never a single "tax" line.

export interface GstRateOption {
  id: string
  /** Total GST %, e.g. 5. */
  ratePct: number
  label: string
}

export const RESTAURANT_GST_RATES: GstRateOption[] = [
  { id: 'standalone-5', ratePct: 5, label: '5% · Standalone restaurant (no ITC)' },
  { id: 'hotel-18', ratePct: 18, label: '18% · Restaurant in hotel premises' },
]

/** Default for the demo restaurant: 5% (CGST 2.5% + SGST 2.5%). */
export const DEFAULT_GST_RATE_PCT = 5

export interface GstBreakdown {
  subtotal: number
  cgstPct: number
  sgstPct: number
  cgst: number
  sgst: number
  /** cgst + sgst */
  totalTax: number
  /** subtotal + totalTax */
  total: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Split a food subtotal into CGST/SGST halves of `gstRatePct` and total it. */
export function calcGst(subtotal: number, gstRatePct: number = DEFAULT_GST_RATE_PCT): GstBreakdown {
  const halfPct = gstRatePct / 2
  // Tax the rounded (billable) subtotal so subtotal + cgst + sgst === total always holds.
  const base = round2(subtotal)
  const cgst = round2((base * halfPct) / 100)
  const sgst = round2((base * halfPct) / 100)
  return {
    subtotal: base,
    cgstPct: halfPct,
    sgstPct: halfPct,
    cgst,
    sgst,
    totalTax: round2(cgst + sgst),
    total: round2(base + cgst + sgst),
  }
}
