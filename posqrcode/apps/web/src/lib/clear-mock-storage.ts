/**
 * Wipe stale mock/local catalog caches so API mode never boots from fixtures.
 * Keeps auth + active venue id so refresh stays logged in.
 */
const CLEAR_FLAG = 'bearqr:mock-cleared-v3'

const KEEP_KEYS = new Set([
  CLEAR_FLAG,
  'bearqr:api-access-token',
  'bearqr:api-refresh-token',
  'bearqr:session',
  'bearqr:current-restaurant-id',
])

export function clearLegacyMockStorage() {
  try {
    if (localStorage.getItem(CLEAR_FLAG) === '1') return
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (!key.startsWith('bearqr:')) continue
      if (KEEP_KEYS.has(key)) continue
      toRemove.push(key)
    }
    for (const key of toRemove) localStorage.removeItem(key)
    localStorage.setItem(CLEAR_FLAG, '1')
  } catch {
    /* ignore */
  }
}
