# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY apps/auth-service ./apps/auth-service
COPY apps/user-service ./apps/user-service
COPY libs ./libs
COPY utils ./utils

RUN npm ci --legacy-peer-deps
RUN npx nest build auth-service

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV AUTH_SERVICE_PORT=3001

COPY --from=builder /app/dist/apps/auth-service ./dist/apps/auth-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3001

CMD ["node", "dist/apps/auth-service/main"]
