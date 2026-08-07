# Stage 1: Build
FROM node:26.5.1-alpine3.23 AS builder
WORKDIR /app

# .npmrc carries legacy-peer-deps=true. Without it `npm ci` here resolves
# peers strictly while every other environment uses legacy resolution, so a
# dependency with a peer conflict fails ONLY inside the container build.
COPY package*.json .npmrc ./
RUN npm ci

COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/auth-service ./apps/auth-service
COPY apps/user-service ./apps/user-service
COPY libs ./libs

RUN npx nest build auth-service
# Upload source maps to Sentry so production stack traces show TypeScript
# instead of compiled dist/ lines. Must run BEFORE `npm prune` — @sentry/cli is
# a devDependency. These ARGs exist only in this builder stage, so the token is
# never present in the shipped runner image.
# The script no-ops when SENTRY_AUTH_TOKEN is unset, and the trailing `|| echo`
# keeps a failed upload from blocking a deploy.
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
# The release these maps are uploaded under. CI passes the commit SHA here;
# RAILWAY_GIT_COMMIT_SHA remains for Railway's own git-triggered builds.
ARG SENTRY_RELEASE
ARG RAILWAY_GIT_COMMIT_SHA
COPY scripts/upload-sourcemaps.mjs ./scripts/
RUN node scripts/upload-sourcemaps.mjs ./dist \
  || echo "[sentry] source map upload failed — continuing build"

RUN npm prune --omit=dev

# Stage 2: Production
FROM node:26.5.1-alpine3.23 AS runner
WORKDIR /app

# Freeze the release into the image so Sentry events match the source maps
# uploaded for this same commit in the builder stage. ARGs do not cross stage
# boundaries, so this must be re-declared here.
#
# This must be SENTRY_RELEASE and not RAILWAY_GIT_COMMIT_SHA: `railway up`
# (how CI deploys) does not populate RAILWAY_GIT_COMMIT_SHA, so every image
# built that way shipped with an empty release — no Sentry release, and
# /health/live reporting "unknown". Railway's own git-triggered builds still
# set RAILWAY_GIT_COMMIT_SHA, which resolveRelease() falls back to at runtime.
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=${SENTRY_RELEASE}

ENV NODE_ENV=production
ENV AUTH_SERVICE_PORT=3001
ENV AUTH_SERVICE_METRICS_PORT=9101
# Railway injects PORT=8080 into every service and main.ts resolves its HTTP
# port as `Number(process.env.PORT) || metricsPort`, so the platform's value
# always won over an ENV PORT of 9101 here. Pinning 8080 makes the image agree
# with the platform instead of silently disagreeing with it, and keeps the
# Prometheus target correct even if Railway stops injecting PORT.
# The 9101-9107 scheme still applies to local development, where all six
# processes share one host — see monitoring/prometheus.yml.
ENV PORT=8080

COPY --from=builder --chown=node:node /app/dist/apps/auth-service ./dist/apps/auth-service
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

USER node

EXPOSE 3001 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health/ready" || exit 1

CMD ["node", "--enable-source-maps", "dist/apps/auth-service/main"]
