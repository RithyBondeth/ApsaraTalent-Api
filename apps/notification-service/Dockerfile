# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY apps/notification-service ./apps/notification-service
COPY libs ./libs
COPY utils ./utils

RUN npm ci --legacy-peer-deps
RUN npx nest build notification-service

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/notification-service ./dist/apps/notification-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3007

CMD ["node", "dist/apps/notification-service/main"]
