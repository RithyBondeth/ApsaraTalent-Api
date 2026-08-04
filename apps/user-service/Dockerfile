# Stage 1: Build
FROM node:24.18.1-alpine3.23 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/user-service ./apps/user-service
COPY libs ./libs

RUN npx nest build user-service
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:24.18.1-alpine3.23 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV USER_SERVICE_PORT=3002
ENV USER_SERVICE_METRICS_PORT=9102
ENV PORT=9102

COPY --from=builder --chown=node:node /app/dist/apps/user-service ./dist/apps/user-service
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

USER node

EXPOSE 3002 9102

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health/ready" || exit 1

CMD ["node", "--enable-source-maps", "dist/apps/user-service/main"]
