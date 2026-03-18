# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY apps/api-gateway ./apps/api-gateway
COPY libs ./libs

RUN npm ci
RUN npx nest build api-gateway

# Stage 2: Production
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/api-gateway ./dist/apps/api-gateway
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create storage directory for chat file uploads.
# NOTE: This directory is ephemeral. On Railway, add a Volume mount at /app/storage
# to persist uploaded files across deploys and restarts.
RUN mkdir -p storage

EXPOSE 3000

CMD ["node", "dist/apps/api-gateway/main"]
