import '@app/common/sentry/instrument';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RpcToHttpExceptionFilter } from './utils/rpc-to-http-exception.filter';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { ApiGatewayModule } from './api-gateway.module';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import {
  isOriginAllowed,
  isCsrfSafeRequest,
  parseAllowedOrigins,
  PUBLIC_STORAGE_FOLDERS,
} from '@app/common';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(ApiGatewayModule);
  const configService = app.get<ConfigService>(ConfigService);
  const isProduction = process.env.NODE_ENV === 'production';

  // =========================================================
  // 1. GLOBAL CONFIGURATION
  // =========================================================

  // The gateway always sits behind a reverse proxy (Railway edge, or a local
  // tunnel in dev). Without this, req.ip is the proxy's address for every
  // request — collapsing all rate-limit buckets into one and making client IPs
  // useless in logs. '1' trusts exactly one hop: the proxy directly in front.
  // Do not raise it; each extra hop is one more X-Forwarded-For entry a client
  // can forge.
  app.set('trust proxy', 1);

  // Convert RPC errors from microservices into proper HTTP responses.
  // Must be registered before ValidationPipe so it catches all unhandled errors.
  app.useGlobalFilters(new RpcToHttpExceptionFilter());

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

  const allowedOrigins = parseAllowedOrigins(
    configService.get<string>('frontend.origin'),
    process.env.ALLOWED_ORIGINS,
  );

  // Browsers automatically attach auth cookies, so state-changing requests
  // using them must originate from the configured frontend. Bearer-only mobile
  // and server clients remain unaffected.
  app.use((req: any, _res: any, next: any) => {
    if (!isCsrfSafeRequest(req, allowedOrigins)) {
      next(new ForbiddenException('Untrusted request origin'));
      return;
    }
    next();
  });

  // A predictable session secret lets anyone forge a session cookie, so a
  // missing one must stop the boot rather than silently degrade to a value
  // that is published in this repository's history.
  const sessionSecret = configService.get<string>('session.secret');
  if (!sessionSecret) {
    if (isProduction) {
      throw new Error(
        'SESSION_SECRET is required in production. Refusing to start with a default secret.',
      );
    }

    console.warn(
      '[bootstrap] SESSION_SECRET is unset — using an insecure development default.',
    );
  }

  // Handle Express sessions securely
  app.use(
    session({
      secret: sessionSecret || 'insecure-development-secret',
      resave: false,
      saveUninitialized: false, // Don't create session until stored
      cookie: {
        httpOnly: true,
        secure: isProduction, // HTTPS required in production
        sameSite: 'lax', // 'lax' required for OAuth redirect flows (Google, Facebook, etc.)
        maxAge: AUTH.SESSION_COOKIE_MAXAGE,
      },
    }),
  );

  // Initialize Passport for OAuth social login flows
  app.use(passport.initialize());

  // =========================================================
  // 3. CORS CONFIGURATION
  // =========================================================

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

  // Only non-sensitive visual assets are public. Resumes, cover letters, and
  // chat attachments are served by authenticated controller endpoints.
  //
  // With the object-store driver the local directories are empty, so mounting
  // them would only add a pointless stat() to every request before falling
  // through to PublicStorageController, which redirects to the bucket/CDN.
  // Both paths answer the same /storage/<folder>/<file> URLs.
  const storageDriver = configService.get<string>('storage.driver');
  if (storageDriver !== 's3') {
    for (const folder of PUBLIC_STORAGE_FOLDERS) {
      app.useStaticAssets(join(process.cwd(), 'storage', folder), {
        prefix: `/storage/${folder}`,
        setHeaders: (res) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      });
    }
  }

  // =========================================================
  // 5. SWAGGER API DOCUMENTATION
  // =========================================================

  // Published only outside production. In production the spec is a complete
  // map of every route, DTO shape and auth requirement — free reconnaissance.
  // Set ENABLE_SWAGGER=true to expose it temporarily on a deployed instance.
  const swaggerEnabled = !isProduction || process.env.ENABLE_SWAGGER === 'true';

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ApsaraTalent API')
      .setDescription('Microservices-based Talent recruitment platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // =========================================================
  // 6. LOGGER & BOOTSTRAP
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
