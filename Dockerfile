# syntax=docker/dockerfile:1

# === BUILD STAGE ===
FROM node:20-alpine AS builder
RUN npm install --global pnpm@9.15.9
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY apps/worker/ ./apps/worker/
COPY turbo.json biome.json ./

ARG NEXT_PUBLIC_WORKER_URL
ENV NEXT_PUBLIC_WORKER_URL=$NEXT_PUBLIC_WORKER_URL
RUN NODE_ENV=development pnpm install --frozen-lockfile
RUN pnpm --filter @adms/database build
RUN pnpm --filter worker build
RUN pnpm --filter web build

# === ALL-IN-ONE RUNTIME: POSTGRES + REDIS + WEB + WORKER ===
FROM postgres:16-alpine AS all-in-one

RUN apk add --no-cache redis su-exec libstdc++ libgcc
COPY --from=builder /usr/local/bin/node /usr/local/bin/node

WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=8080 \
    WORKER_PORT=8888 \
    REDIS_HOST=127.0.0.1 \
    REDIS_PORT=6379 \
    PGDATA=/var/lib/postgresql/data

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY scripts/docker-all-in-one.sh /usr/local/bin/docker-all-in-one
RUN chmod +x /usr/local/bin/docker-all-in-one \
    && mkdir -p /var/lib/redis /app/apps/web/uploads \
    && chown -R postgres:postgres /var/lib/postgresql \
    && chown -R redis:redis /var/lib/redis

VOLUME ["/var/lib/postgresql/data", "/var/lib/redis", "/app/apps/web/uploads"]
EXPOSE 8080 8888
ENTRYPOINT ["/usr/local/bin/docker-all-in-one"]
