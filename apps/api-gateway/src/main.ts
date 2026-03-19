import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { ApiGatewayModule } from './api-gateway.module';
import {
  isOriginAllowed,
  parseAllowedOrigins,
} from './utils/cors-origin.util';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(ApiGatewayModule);

  // Serve uploaded chat attachments as static files at /storage/**
  // Files are written by the POST /chat/upload endpoint and read back by the frontend.
  app.useStaticAssets(join(process.cwd(), 'storage'), { prefix: '/storage' });
  const configService = app.get<ConfigService>(ConfigService);

  // Enable socket.io WebSocket adapter — required for ChatGateway to work
  app.useWebSocketAdapter(new IoAdapter(app));

  // Enable Cookie Parser
  app.use(cookieParser());

  //Enable Express Session
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(
    session({
      secret: configService.get<string>('session.secret'),
      resave: false,
      saveUninitialized: false, // Don't create session until something is stored
      cookie: {
        httpOnly: true,
        secure: isProduction, // HTTPS-only in production
        sameSite: 'strict', // Stricter CSRF protection
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );

  const configuredOrigins = parseAllowedOrigins(
    configService.get<string>('frontend.origin'),
    process.env.ALLOWED_ORIGINS,
  );
  const allowedOrigins = configuredOrigins;
  const allowAllCors = process.env.CORS_ALLOW_ALL === 'true';

  // Enable Frontend CORS
  app.enableCors({
    origin: (origin, callback) => {
      if (allowAllCors || isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  //Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
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
