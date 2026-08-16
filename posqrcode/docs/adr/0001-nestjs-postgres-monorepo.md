# ADR 0001: NestJS + PostgreSQL + pnpm monorepo

## Status

Accepted

## Context

Bear 360 UI is a Vite/React demo with localStorage domains. We need a production backend with multi-tenancy, JWT/PIN auth, and realtime orders.

## Decision

- **NestJS + TypeScript** for the API (domain modules align with UI)
- **Prisma + PostgreSQL** for relational tenancy and money precision
- **pnpm workspaces**: `apps/web`, `apps/api`, `packages/shared`
- **Socket.IO** for kitchen/POS/QR order events
- **Redis** in compose for future adapter/queues

## Consequences

- Shared Zod DTOs live in `@bear360/shared`
- Frontend can keep mocks via `VITE_USE_MOCK` during cutover
- Team must run Docker for Postgres locally
