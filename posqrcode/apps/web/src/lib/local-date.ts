/** Local calendar helpers — avoid UTC drift from toISOString() in IST. */

export function localMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function localDate(d = new Date()): string {
  return `${localMonth(d)}-${String(d.getDate()).padStart(2, '0')}`
}

export function monthKeyFromIso(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 7)
  return localMonth(d)
}
