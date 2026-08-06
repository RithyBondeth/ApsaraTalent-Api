# Stage 1: Build
FROM node:24.18.1-alpine3.23 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/api-gateway ./apps/api-gateway
COPY apps/resume-builder-service ./apps/resume-builder-service
COPY libs ./libs

RUN npx nest build api-gateway
# Upload source maps to Sentry so production stack traces show TypeScript
# instead of compiled dist/ lines. Must run BEFORE `npm prune` — @sentry/cli is
# a devDependency. These ARGs exist only in this builder stage, so the token is
# never present in the shipped runner image.
# The script no-ops when SENTRY_AUTH_TOKEN is unset, and the trailing `|| echo`
# keeps a failed upload from blocking a deploy.
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG RAILWAY_GIT_COMMIT_SHA
COPY scripts/upload-sourcemaps.mjs ./scripts/
RUN node scripts/upload-sourcemaps.mjs ./dist \
  || echo "[sentry] source map upload failed — continuing build"

RUN npm prune --omit=dev

# Stage 2: Production
FROM node:24.18.1-alpine3.23 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV API_GATEWAY_PORT=3000
ENV AUTH_SERVICE_HOST=auth-service.railway.internal
ENV AUTH_SERVICE_PORT=3001
ENV USER_SERVICE_HOST=user-service.railway.internal
ENV USER_SERVICE_PORT=3002
ENV RESUME_SERVICE_HOST=resume-builder-service.railway.internal
ENV RESUME_SERVICE_PORT=3003
ENV CHAT_SERVICE_HOST=chat-service.railway.internal
ENV CHAT_SERVICE_PORT=3004
ENV JOB_SERVICE_HOST=job-service.railway.internal
ENV JOB_SERVICE_PORT=3005
ENV NOTIFICATION_SERVICE_HOST=notification-service.railway.internal
ENV NOTIFICATION_SERVICE_PORT=3007

COPY --from=builder --chown=node:node /app/dist/apps/api-gateway ./dist/apps/api-gateway
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

# Create storage directory for chat file uploads.
# NOTE: This directory is ephemeral. On Railway, add a Volume mount at /app/storage
# to persist uploaded files across deploys and restarts.
RUN mkdir -p storage && chown node:node storage

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health/ready" || exit 1

CMD ["node", "--enable-source-maps", "dist/apps/api-gateway/main.js"]
