# syntax=docker/dockerfile:1
# =============================================================================
# Imagen multi-stage de las 3 apps del monorepo (O5.2)
#
# Uso:
#   docker build --build-arg APP=identity -t rwa/identity .
#   docker build --build-arg APP=issuer   -t rwa/issuer .
#   docker build --build-arg APP=token    -t rwa/token .
#
# Las variables NEXT_PUBLIC_* se inlinean en el bundle de cliente: se pasan como
# build args (ver `docker-compose.yml`). PORT es configurable en runtime y las
# 3 imágenes exponen `/api/health` para el healthcheck.
# =============================================================================

ARG APP=identity

# --- Dependencias + build ----------------------------------------------------
FROM node:22-alpine AS builder
ARG APP
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_DEPLOYMENT_JSON
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID \
    NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_DEPLOYMENT_JSON=$NEXT_PUBLIC_DEPLOYMENT_JSON \
    NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile

RUN pnpm --filter @rwa/${APP} build

# --- Runtime -----------------------------------------------------------------
FROM node:22-alpine AS runner
ARG APP
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_NAME=${APP} \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# `output: "standalone"` deja el server.js y las dependencias mínimas.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/${APP}/public ./apps/${APP}/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

CMD ["sh", "-c", "node apps/${APP_NAME}/server.js"]
