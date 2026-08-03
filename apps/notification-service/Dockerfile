# Stage 1: Build
FROM node:24.18.1-alpine3.23 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/notification-service ./apps/notification-service
COPY libs ./libs

RUN npx nest build notification-service
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:24.18.1-alpine3.23 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NOTIFICATION_SERVICE_PORT=3007
ENV NOTIFICATION_SERVICE_METRICS_PORT=9107
ENV PORT=9107

COPY --from=builder --chown=node:node /app/dist/apps/notification-service ./dist/apps/notification-service
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

USER node

EXPOSE 3007 9107

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health/ready" || exit 1

CMD ["node", "--enable-source-maps", "dist/apps/notification-service/main"]
