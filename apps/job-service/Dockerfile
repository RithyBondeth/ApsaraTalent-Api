# Stage 1: Build
FROM node:24.18.1-alpine3.23 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/job-service ./apps/job-service
COPY apps/user-service ./apps/user-service
COPY libs ./libs

RUN npx nest build job-service
RUN npm prune --omit=dev

# Stage 2: Production
FROM node:24.18.1-alpine3.23 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV JOB_SERVICE_PORT=3005
ENV JOB_SERVICE_METRICS_PORT=9105
ENV PORT=9105

COPY --from=builder --chown=node:node /app/dist/apps/job-service ./dist/apps/job-service
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

USER node

EXPOSE 3005 9105

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health/ready" || exit 1

CMD ["node", "--enable-source-maps", "dist/apps/job-service/main"]
