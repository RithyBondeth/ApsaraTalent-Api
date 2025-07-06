import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { Logger } from 'nestjs-pino';
import * as session from 'express-session';
import * as passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If need to allow cookies
  })

  // // 🔐 Session middleware - REQUIRED for OAuth with state
  // app.use(
  //   session({
  //     secret: process.env.SESSION_SECRET || '0f680d29e53a14c4d0d5e1c513502704ad2746b756c025c0b3654d4a2e71f2d3', // Replace in prod
  //     resave: false,
  //     saveUninitialized: false,
  //     cookie: { secure: false, sameSite: 'lax' },
  //   }),
  // );

  // app.use(passport.initialize());
  // app.use(passport.session());

  //Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
  await app.listen(process.env.API_GATEWAY_PORT);
  logger.log("Api gateway is running on port " + process.env.API_GATEWAY_PORT);
}
bootstrap();
