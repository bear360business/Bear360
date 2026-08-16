# Bear 360

Multi-tenant food OS — QR ordering, POS, kitchen, staff, and Super Admin.

The UI started as a **localStorage demo**. The repo is now a **pnpm monorepo** with a NestJS API (P0/P1 foundation).

## Docs

- **Backend & architecture:** [docs/README.md](./docs/README.md)
- **UI specs (screens):** [BEARQR_UI_ARCHITECTURE.md](./BEARQR_UI_ARCHITECTURE.md), [BEARQR_SAAS_UI_ARCHITECTURE.md](./BEARQR_SAAS_UI_ARCHITECTURE.md)
- **Local runbook:** [docs/runbooks/local-dev.md](./docs/runbooks/local-dev.md)

## Monorepo

| Package | Path |
|---------|------|
| Web (Vite/React) | `apps/web` |
| API (NestJS) | `apps/api` |
| Shared DTOs | `packages/shared` |

## Quick start (UI mocks — no Docker)

```sh
pnpm install
pnpm --filter @bear360/shared build
pnpm dev:web        # http://localhost:5173
```

Web defaults to `VITE_USE_MOCK=true` (localStorage).

## Full stack

```sh
pnpm db:up          # Docker: Postgres + Redis
pnpm db:generate
pnpm --filter @bear360/api exec prisma migrate deploy
pnpm db:seed
pnpm dev            # API :3001 + Web :5173
```

Set in `apps/web/.env.local`:

```
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001/realtime
```

OpenAPI: http://localhost:3001/api/docs

## Stack

- **Web:** React 18, TypeScript, Vite, Tailwind, shadcn
- **API:** NestJS, Prisma, PostgreSQL, Socket.IO, argon2 JWT auth
- **Shared:** Zod schemas + order state machine + realtime event names
