import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { Logger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);

  app.use(cookieParser());

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('frontend.origin'),
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  //Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
  const port = configService.get('services.apiGateway.port');
  await app.listen(port);
  logger.log(`Api gateway is running on port ${port}`);
}
bootstrap();
