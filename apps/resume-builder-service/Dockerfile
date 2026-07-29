# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nest-cli.json webpack.config.js ./
COPY tsconfig*.json ./
COPY apps/resume-builder-service ./apps/resume-builder-service
COPY libs ./libs

RUN npm ci --include=optional
RUN npx nest build resume-builder-service

# Stage 2: Production
# Puppeteer requires Chrome dependencies
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV RESUME_SERVICE_PORT=3003
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

COPY --from=builder /app/dist/apps/resume-builder-service ./dist/apps/resume-builder-service
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

RUN chown -R node:node /app
USER node

EXPOSE 3003

CMD ["node", "--enable-source-maps", "dist/apps/resume-builder-service/main"]
