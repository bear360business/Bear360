# Migration: localStorage → API

## Flag

| Env | Behavior |
|-----|----------|
| `VITE_USE_MOCK=true` (default) | Existing providers / localStorage |
| `VITE_USE_MOCK=false` | `api-client` + Nest endpoints |

## Cutover order

1. **Auth** — `login` / `staff-login` / session tokens in memory + `localStorage` token keys
2. **Orders + realtime** — list/create/status + Socket.IO subscribe
3. **Entitlements** — replace client FeatureGate source
4. **Menu / tables**
5. **Staff / roles**
6. **Inventory / finance / shop / super catalogs**

## Checklist per domain

- [ ] Shared Zod DTO covers payloads
- [ ] Nest module + tenant guard
- [ ] Web hook dual-path (`useMock ? local : api`)
- [ ] Remove `bearqr:*` key once stable
- [ ] Update this doc

## Token storage (API mode)

- `bearqr:api-access-token`
- `bearqr:api-refresh-token`

See [`apps/web/src/lib/api-client.ts`](../../apps/web/src/lib/api-client.ts).
