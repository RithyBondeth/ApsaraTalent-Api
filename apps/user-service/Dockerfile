# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/user-service ./apps/user-service
COPY libs ./libs

RUN npm ci
RUN npx nest build user-service

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV USER_SERVICE_PORT=3002

COPY --from=builder /app/dist/apps/user-service ./dist/apps/user-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3002

CMD ["node", "--enable-source-maps", "dist/apps/user-service/main"]
