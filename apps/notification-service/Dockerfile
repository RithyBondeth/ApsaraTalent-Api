# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/notification-service ./apps/notification-service
COPY libs ./libs

RUN npm ci
RUN npx nest build notification-service

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NOTIFICATION_SERVICE_PORT=3007

COPY --from=builder /app/dist/apps/notification-service ./dist/apps/notification-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3007

CMD ["node", "--enable-source-maps", "dist/apps/notification-service/main"]
