FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

ENV NODE_ENV=development

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY biome.json turbo.json ./

RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=api

# Cleanup devDeps & build artifacts to reduce image size
RUN rm -rf apps/api/src packages/*/src .turbo biome.json turbo.json

ENV NODE_ENV=production
ENV PORT=8888
ENV TZ=Asia/Jakarta
EXPOSE 8888
CMD ["node", "apps/api/dist/main.js"]
