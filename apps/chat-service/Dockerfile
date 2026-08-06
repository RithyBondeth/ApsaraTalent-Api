# Stage 1: Build
FROM node:24.18.1-alpine3.23 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/chat-service ./apps/chat-service
COPY libs ./libs

RUN npx nest build chat-service
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
ENV CHAT_SERVICE_PORT=3004
ENV CHAT_SERVICE_METRICS_PORT=9104
ENV PORT=9104

COPY --from=builder --chown=node:node /app/dist/apps/chat-service ./dist/apps/chat-service
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

USER node

EXPOSE 3004 9104

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health/ready" || exit 1

CMD ["node", "--enable-source-maps", "dist/apps/chat-service/main"]
