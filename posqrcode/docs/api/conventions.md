# API conventions

## Base

- Prefix: `/api/v1`
- OpenAPI UI: `/api/docs`
- JSON request/response bodies

## Auth

```
Authorization: Bearer <accessToken>
```

| Endpoint | Auth |
|----------|------|
| `POST /auth/login` | Public |
| `POST /auth/staff-login` | Public |
| `POST /auth/refresh` | Refresh body |
| `POST /auth/logout` | Refresh body |
| `GET /tenants` | JWT |
| `GET /entitlements/:restaurantId` | JWT + tenant |
| `* /restaurants/:restaurantId/orders` | JWT + tenant |
| `* /public/r/:restaurantId/*` | Public (rate-limit later) |

## Errors

Problem-style JSON:

```json
{ "code": "TENANT_FORBIDDEN", "message": "No access to this restaurant", "details": {} }
```

Common codes: `INVALID_CREDENTIALS`, `INVALID_PIN`, `ROLE_MISMATCH`, `TENANT_FORBIDDEN`, `INVALID_TRANSITION`, `NOT_FOUND`.

## Pagination (future)

Use `?cursor=` + `limit=` for list endpoints. Orders currently return latest 100.

## Validation

Request bodies validated with Zod schemas from `@bear360/shared` (shared with the web app).
