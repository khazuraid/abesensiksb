FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY biome.json turbo.json ./

RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=web --concurrency=1

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 8080
ENV HOSTNAME="0.0.0.0"
ENV PORT=8080
CMD ["node", "apps/web/server.js"]
