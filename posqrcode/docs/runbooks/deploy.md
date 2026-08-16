# Deploy notes

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis (queues + Socket.IO adapter) |
| `JWT_ACCESS_SECRET` | Access token HMAC secret |
| `JWT_REFRESH_SECRET` | Refresh token HMAC secret |
| `JWT_ACCESS_TTL` | e.g. `15m` |
| `JWT_REFRESH_TTL` | e.g. `7d` |
| `PORT` | API port (default `3001`) |
| `CORS_ORIGIN` | Web origin |

Never commit production secrets. Rotate JWT secrets on compromise (invalidates sessions).

## Release steps

1. `pnpm --filter @bear360/shared build`
2. `pnpm --filter @bear360/api exec prisma migrate deploy`
3. `pnpm --filter @bear360/api build && node apps/api/dist/main.js`
4. Deploy `apps/web` static build with `VITE_API_URL` / `VITE_USE_MOCK=false`

## Zero-downtime

- Run migrations before rolling new API pods
- Prefer additive schema changes; avoid destructive drops without a dual-write window
- Socket.IO needs sticky sessions or Redis adapter when scaling API replicas
