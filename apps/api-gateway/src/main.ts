import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
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
import { isOriginAllowed, parseAllowedOrigins } from './utils/cors-origin.util';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(ApiGatewayModule);
  const configService = app.get<ConfigService>(ConfigService);
  const isProduction = process.env.NODE_ENV === 'production';

  // =========================================================
  // 1. GLOBAL CONFIGURATION
  // =========================================================

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

  // Handle Express sessions securely
  app.use(
    session({
      secret: configService.get<string>('session.secret') || 'default-secret',
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

  // Allow cross-origin loading of stored assets (avatars, covers, resumes, etc.)
  // Helmet's default Cross-Origin-Resource-Policy: same-origin would block <img>
  // tags and fetch() from the frontend (different port/origin) from loading files.
  app.use('/storage', (_req: any, res: any, next: any) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // Serve uploaded chat attachments publicly via /storage path
  app.useStaticAssets(join(process.cwd(), 'storage'), { prefix: '/storage' });

  // =========================================================
  // 5. SWAGGER API DOCUMENTATION
  // =========================================================

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ApsaraTalent API')
    .setDescription('Microservices-based Talent recruitment platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

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
