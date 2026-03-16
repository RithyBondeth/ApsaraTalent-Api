import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { Logger } from 'nestjs-pino';
import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
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
        sameSite: 'strict',   // Stricter CSRF protection
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );

  // Enable Frontend Cors
  app.enableCors({
    origin: configService.get<string>('frontend.origin'),
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  //Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
  const port = configService.get<number>('services.apiGateway.port');
  await app.listen(port);
  logger.log(`Api gateway is running on port ${port}`);
}
bootstrap();
