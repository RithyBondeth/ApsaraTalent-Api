# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY apps/payment-service ./apps/payment-service
COPY libs ./libs

RUN npm ci
RUN npx nest build payment-service

# Stage 2: Production
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist/apps/payment-service ./dist/apps/payment-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3006

CMD ["node", "dist/apps/payment-service/main"]
