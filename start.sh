#!/bin/sh
set -e

echo "=== Starting Bear 360 API ==="
echo "Node version: $(node -v)"
echo "Port: ${PORT:-3001}"

if [ -d "posqrcode" ]; then
  cd posqrcode
fi

if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL is set. Running database migrations..."
  pnpm --filter @bear360/api prisma:migrate:deploy || echo "Prisma migration skipped or encountered non-fatal error."
else
  echo "WARNING: DATABASE_URL is NOT set in environment variables! Please set DATABASE_URL in Railway Variables tab."
fi

echo "Launching NestJS application on 0.0.0.0:${PORT:-3001}..."
exec node apps/api/dist/main.js
