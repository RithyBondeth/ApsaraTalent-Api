import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { Logger } from 'nestjs-pino';
import { join } from 'path';
import { ApiGatewayModule } from './api-gateway.module';

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

  const configuredOrigins = (
    configService.get<string>('frontend.origin') || ''
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : ['http://localhost:4000'];

  // Enable Frontend CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without Origin header (mobile apps, cURL, health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
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
    `Api gateway is running on port ${port} (origins: ${allowedOrigins.join(', ')})`,
  );
}
bootstrap();
