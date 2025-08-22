import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { Logger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:4000',
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  //Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
  await app.listen(process.env.API_GATEWAY_PORT);
  logger.log("Api gateway is running on port " + process.env.API_GATEWAY_PORT);
}
bootstrap();
