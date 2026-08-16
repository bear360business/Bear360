# Bear 360 documentation

Start here for backend, API, and migration docs. UI screen specs remain in the repo root:

- [BEARQR_UI_ARCHITECTURE.md](../BEARQR_UI_ARCHITECTURE.md)
- [BEARQR_SAAS_UI_ARCHITECTURE.md](../BEARQR_SAAS_UI_ARCHITECTURE.md)

## Index

| Doc | Purpose |
|-----|---------|
| [architecture/overview.md](./architecture/overview.md) | System context, tenancy, auth |
| [architecture/modules.md](./architecture/modules.md) | Nest modules ↔ UI hooks |
| [architecture/realtime.md](./architecture/realtime.md) | Socket.IO rooms and events |
| [data-model.md](./data-model.md) | PostgreSQL / Prisma model |
| [api/conventions.md](./api/conventions.md) | REST conventions, errors, auth |
| [runbooks/local-dev.md](./runbooks/local-dev.md) | Docker, migrate, seed, run |
| [runbooks/deploy.md](./runbooks/deploy.md) | Env vars and deploy notes |
| [migration/localStorage-to-api.md](./migration/localStorage-to-api.md) | Frontend cutover checklist |
| [adr/](./adr/) | Architecture Decision Records |

Live OpenAPI (when API is running): `http://localhost:3001/api/docs`
