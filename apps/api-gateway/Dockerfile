# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY apps/api-gateway ./apps/api-gateway
COPY apps/resume-builder-service ./apps/resume-builder-service
COPY libs ./libs
COPY utils ./utils

RUN npm ci --legacy-peer-deps
RUN npx nest build api-gateway

# Stage 2: Production
FROM node:20-alpine AS runner
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

COPY --from=builder /app/dist/apps/api-gateway ./dist/apps/api-gateway
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create storage directory for chat file uploads.
# NOTE: This directory is ephemeral. On Railway, add a Volume mount at /app/storage
# to persist uploaded files across deploys and restarts.
RUN mkdir -p storage

EXPOSE 3000

CMD ["node", "dist/apps/api-gateway/main.js"]
