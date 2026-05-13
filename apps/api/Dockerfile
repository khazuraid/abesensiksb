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

# Flatten node_modules: copy real files (dereference symlinks)
RUN cp -rL node_modules /prod_modules

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /prod_modules/ ./node_modules/
COPY --from=builder /app/apps/api/dist/ ./dist/

ENV PORT=8888
EXPOSE 8888
CMD ["node", "dist/main.js"]
