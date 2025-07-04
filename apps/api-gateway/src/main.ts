import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If need to allow cookies
  })

  //Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
  await app.listen(process.env.API_GATEWAY_PORT);
  logger.log("Api gateway is running on port " + process.env.API_GATEWAY_PORT);
}
bootstrap();
