import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { ApiGatewayModule } from './api-gateway.module';
import { isOriginAllowed, parseAllowedOrigins } from './utils/cors-origin.util';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(ApiGatewayModule);
  const configService = app.get<ConfigService>(ConfigService);
  const isProduction = process.env.NODE_ENV === 'production';

  // =========================================================
  // 1. GLOBAL CONFIGURATION
  // =========================================================

  // Set global prefix for all routes (e.g., /api/v1/user)
  app.setGlobalPrefix('api/v1');

  // Ensure request payload validation and transformation via DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips non-DTO properties automatically
      transform: true, // Transforms payloads to instances of their DTO classes
    }),
  );

  // =========================================================
  // 2. SECURITY & MIDDLEWARE
  // =========================================================

  // Secure HTTP headers against common vulnerabilities
  app.use(helmet());

  // Gzip compression for faster payload delivery
  app.use(compression());

  // Parse cookies attached to client requests
  app.use(cookieParser());

  // Handle Express sessions securely
  app.use(
    session({
      secret: configService.get<string>('session.secret') || 'default-secret',
      resave: false,
      saveUninitialized: false, // Don't create session until stored
      cookie: {
        httpOnly: true,
        secure: isProduction, // HTTPS required in production
        sameSite: 'strict', // Strict CSRF protection
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );

  // =========================================================
  // 3. CORS CONFIGURATION
  // =========================================================

  const allowedOrigins = parseAllowedOrigins(
    configService.get<string>('frontend.origin'),
    process.env.ALLOWED_ORIGINS,
  );
  const allowAllCors = process.env.CORS_ALLOW_ALL === 'true';

  app.enableCors({
    origin: (origin, callback) => {
      // Allow unrestricted or validate against allowed origins
      if (allowAllCors || isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Required for secure cookie transmission
  });

  // =========================================================
  // 4. WEBSOCKETS & STATIC ASSETS
  // =========================================================

  // Enable Socket.IO WS adapter — required for ChatGateway realtime sync
  app.useWebSocketAdapter(new IoAdapter(app));

  // Serve uploaded chat attachments publicly via /storage path
  app.useStaticAssets(join(process.cwd(), 'storage'), { prefix: '/storage' });

  // =========================================================
  // 5. LOGGER & BOOTSTRAP
  // =========================================================

  // Attach centralized logging via nestjs-pino
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Connect downstream microservices (TCP, Redis, gRPC, etc.)
  await app.startAllMicroservices();

  // Expose API Gateway to the network
  const port =
    Number(process.env.PORT) ||
    configService.get<number>('services.apiGateway.port') ||
    3000;
  await app.listen(port);

  logger.log(
    `Api gateway is running on port ${port} (origins: ${
      allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'ALL'
    }, allowAllCors=${allowAllCors})`,
  );
}
bootstrap();
