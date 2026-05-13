FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=development

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY biome.json turbo.json ./

RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=api

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy dist (webpack bundle, includes @adms/* packages)
COPY --from=builder /app/apps/api/dist/ ./dist/

# Copy node_modules dari root (semua runtime deps ada di sini via hoisting)
COPY --from=builder /app/node_modules/ ./node_modules/

# Migration files
COPY packages/database/bootstrap.sql ./migrate/bootstrap.sql
COPY packages/database/seed-admin.sql ./migrate/seed-admin.sql
COPY packages/database/migrate.js ./migrate/migrate.js

ENV PORT=8888
EXPOSE 8888

CMD ["sh", "-c", "node migrate/migrate.js && node dist/main.js"]
