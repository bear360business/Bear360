FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY posqrcode ./posqrcode

WORKDIR /app/posqrcode

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @bear360/shared build
RUN pnpm --filter @bear360/api prisma:generate
RUN pnpm --filter @bear360/api build

FROM node:20-slim AS runner
WORKDIR /app/posqrcode

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY --from=builder /app/posqrcode /app/posqrcode

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["sh", "-c", "pnpm --filter @bear360/api prisma:migrate:deploy && node apps/api/dist/main.js"]
