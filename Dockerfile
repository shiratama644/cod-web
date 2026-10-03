# syntax=docker/dockerfile:1.7
# cod-web Dockerfile — multi-stage, bun workspaces (Next.js web + Bun gameserver)
# TEMPLATE_REPO の Dockerfile(pnpm/Node24)を bun + 本モノレポ構成に書き直したもの。
#
# Usage:
#   docker build --target web -t cod-web-web .
#   docker build --target gameserver -t cod-web-gameserver .
#   docker compose --profile app up --build     # web + gameserver + postgres
#
# base は node:22-alpine(.nvmrc と一致)+ npm 経由で bun を導入する。
# next CLI は node で、ワークスペースのスクリプト実行は bun で行うため両方が必要。

ARG NODE_VERSION=22
ARG BUN_VERSION=1.4.0

# ---------- Base ----------
FROM node:${NODE_VERSION}-alpine AS base
ARG BUN_VERSION
RUN npm install -g bun@${BUN_VERSION}
WORKDIR /app

# ---------- Deps(ワークスペース manifest のみコピーして install をキャッシュ)----------
FROM base AS deps
COPY package.json bun.lock bunfig.toml ./
COPY apps/web/package.json ./apps/web/
COPY apps/gameserver/package.json ./apps/gameserver/
COPY packages/protocol/package.json ./packages/protocol/
COPY packages/engine-core/package.json ./packages/engine-core/
COPY packages/profile-fps/package.json ./packages/profile-fps/
COPY packages/gamemode-api/package.json ./packages/gamemode-api/
COPY packages/gamemode-sdk/package.json ./packages/gamemode-sdk/
RUN bun install --frozen-lockfile

# ---------- Development(devcontainer / compose でソースを bind mount して使う)----------
FROM deps AS development
ENV NODE_ENV=development
EXPOSE 3000 8080
CMD ["bun", "run", "dev"]

# ---------- Build ----------
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && bun run build

# ---------- Web(Next.js 本番)----------
FROM base AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
EXPOSE 3000
CMD ["sh", "-c", "cd apps/web && bun run start -- -H 0.0.0.0 -p 3000"]

# ---------- Gameserver(権威ゲームサーバ・Bun ランタイム直実行)----------
FROM base AS gameserver
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=deps /app/node_modules /app/node_modules
COPY package.json bun.lock bunfig.toml tsconfig.base.json ./
COPY packages ./packages
COPY gamemodes ./gamemodes
COPY apps/gameserver ./apps/gameserver
EXPOSE 8080
CMD ["bun", "run", "apps/gameserver/src/index.ts"]
