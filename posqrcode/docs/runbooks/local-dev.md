# Local development

## Prerequisites

- Node 20+
- pnpm 10+
- Docker Desktop (Postgres + Redis)

## Start infrastructure

```sh
pnpm db:up
# postgres://bear360:bear360@localhost:5432/bear360
# redis://localhost:6379
```

Copy API env if needed:

```sh
cp apps/api/.env.example apps/api/.env
```

## Migrate + seed

```sh
pnpm db:generate
pnpm --filter @bear360/api exec prisma migrate deploy
# or during development:
pnpm --filter @bear360/api exec prisma migrate dev
pnpm db:seed
```

## Run apps

```sh
pnpm --filter @bear360/shared build
pnpm dev:api    # http://localhost:3001  OpenAPI /api/docs
pnpm dev:web    # http://localhost:5173
```

Or both: `pnpm dev`

## Web API mode

By default the web app stays on **localStorage mocks** (`VITE_USE_MOCK=true`).

To hit the Nest API:

```sh
# apps/web/.env.local
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001/realtime
```

## Demo credentials (seed)

| Portal | Creds |
|--------|--------|
| Restaurant | `owner@masala-bear.com` / `password` |
| Super | `anya@bear360.app` / `password` |
| Kitchen | `kitchen@masala-bear.com` / `password` |
| Staff PIN | phone `9876543210` / PIN `1234` @ restaurant `masala-bear` |
