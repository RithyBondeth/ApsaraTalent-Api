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
