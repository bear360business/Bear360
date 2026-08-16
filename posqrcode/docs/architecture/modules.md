# Nest modules ↔ UI

| Nest module | Path | Replaces / feeds |
|-------------|------|------------------|
| `HealthModule` | `GET /api/v1/health` | Ops |
| `AuthModule` | `/api/v1/auth/*` | `bearqr:session`, staff PIN login |
| `TenantsModule` | `/api/v1/tenants` | `bearqr:restaurants` |
| `EntitlementsModule` | `/api/v1/entitlements/:id` | `bearqr:tenant` + platform/industry |
| `OrdersModule` | `/api/v1/restaurants/:id/orders` | `bearqr:orders` |
| `PublicOrdersController` | `/api/v1/public/r/:id/*` | Guest QR place + track |
| `RealtimeModule` | Socket.IO `/realtime` | `storage` / custom events |

## Planned (P2+)

| Module | UI today |
|--------|----------|
| MenuModule | `use-menu` |
| TablesModule | `use-tables` |
| StaffModule | `use-staff`, `use-staff-roles` |
| InventoryModule | `use-inventory` |
| ShopModule | `use-shop` |
| Support / Leads | Super portal |

Each new module should add a short `apps/api/src/modules/<name>/README.md`.
