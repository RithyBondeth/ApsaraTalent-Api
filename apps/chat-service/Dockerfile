# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY apps/chat-service ./apps/chat-service
COPY libs ./libs

RUN npm ci
RUN npx nest build chat-service

# Stage 2: Production
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/chat-service ./dist/apps/chat-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3004

CMD ["node", "dist/apps/chat-service/main"]
