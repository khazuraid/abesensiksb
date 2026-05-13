FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY biome.json turbo.json ./

RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=api
RUN pnpm deploy --filter=api --prod /prod/api

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /prod/api/node_modules/ ./node_modules/
COPY --from=builder /app/apps/api/dist/ ./dist/

ENV PORT=8888
EXPOSE 8888
CMD ["node", "dist/main.js"]
