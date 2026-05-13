# === BUILD STAGE ===
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY biome.json turbo.json ./

RUN pnpm install --frozen-lockfile
RUN pnpm turbo build

# === API PRODUCTION ===
FROM node:20-alpine AS api
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8888
CMD ["node", "dist/main.js"]

# === WEB PRODUCTION ===
FROM node:20-alpine AS web
WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 8080
ENV HOSTNAME="0.0.0.0"
ENV PORT=8080
CMD ["node", "server.js"]
