# OmniRoute backend — headless API-only image (no dashboard UI).
#
# Same proven pipeline as the root Dockerfile (base deps → builder → standalone
# runner) with OMNIROUTE_BUILD_BACKEND_ONLY=1: every dashboard page is stubbed
# before `next build`, so the client graph (recharts/monaco/mermaid/…) never
# compiles. Result: faster build, smaller image, pure API server.
#
# ponytail: skeleton duplicated from root Dockerfile instead of shared —
# BuildKit has no include mechanism across contexts. When the two drift,
# diff against the root file; upstream fixes (CVE patches, worker caps)
# should be ported here or this collapses back into a --build-arg on root.

FROM node:22-trixie-slim AS base
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libsecret-1-0 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ── Builder ────────────────────────────────────────────────────────────────
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY open-sse/package.json ./open-sse/package.json
COPY scripts/build/postinstall.mjs ./scripts/build/postinstall.mjs
COPY scripts/build/postinstallSupport.mjs ./scripts/build/postinstallSupport.mjs
COPY scripts/build/native-binary-compat.mjs ./scripts/build/native-binary-compat.mjs
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
RUN test -f package-lock.json || (echo "package-lock.json required" >&2 && exit 1)

RUN --mount=type=cache,id=omniroute-backend-npm,target=/root/.npm \
  npm ci --include=optional --no-audit --no-fund --legacy-peer-deps --ignore-scripts \
  && (cd node_modules/better-sqlite3 \
      && node /usr/local/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild) \
  && node -e "require('better-sqlite3')(':memory:').close()" \
  && node node_modules/tls-client-node/scripts/postinstall.js

ARG OMNIROUTE_BUILD_MEMORY_MB=6144
ENV NODE_OPTIONS="--max-old-space-size=${OMNIROUTE_BUILD_MEMORY_MB}"
ARG OMNIROUTE_BUILD_WORKERS=3
ENV CIRCLE_NODE_TOTAL=${OMNIROUTE_BUILD_WORKERS}
# Headless: stub all dashboard pages, keep every route.ts handler.
ENV OMNIROUTE_BUILD_BACKEND_ONLY=1

COPY . ./
RUN mkdir -p /app/data && npm run build:backend

# ── Runner ─────────────────────────────────────────────────────────────────
FROM base AS runner
LABEL org.opencontainers.image.title="omniroute-backend" \
  org.opencontainers.image.description="OmniRoute headless AI router API" \
  org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production
ENV PORT=20128
ENV HOSTNAME=0.0.0.0
ENV OMNIROUTE_MEMORY_MB=1024
ENV NODE_OPTIONS="--max-old-space-size=${OMNIROUTE_MEMORY_MB}"
ENV DATA_DIR=/app/data
ENV OMNIROUTE_MIGRATIONS_DIR=/app/migrations
RUN mkdir -p /app/data

COPY --from=builder /app/.build/next/standalone ./
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/scripts/dev/healthcheck.mjs ./healthcheck.mjs

RUN chown -R node:node /app
USER node
EXPOSE 20128

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "healthcheck.mjs"]

CMD ["node", "dev/run-standalone.mjs"]
