FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY biome.json turbo.json ./

RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=api

# Flatten node_modules: copy dengan dereference symlinks
RUN mkdir -p /prod_modules && cp -rL /app/node_modules/* /prod_modules/ 2>/dev/null || true

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/apps/api/dist/ ./dist/
COPY --from=builder /prod_modules/ ./node_modules/

ENV PORT=8888
EXPOSE 8888
CMD ["node", "dist/main.js"]
