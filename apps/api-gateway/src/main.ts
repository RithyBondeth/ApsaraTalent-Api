import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { Logger } from 'nestjs-pino';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If need to allow cookies
  })

  // WebSocket Gateway Setup
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_WEBSOCKET_HOST,
      port: Number(process.env.REDIS_WEBSOCKET_PORT),
      connectTimeout: 10000,
      retryAttempts: 5,
      retryDelay: 3000
    }
  });

  //Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
  await app.listen(process.env.API_GATEWAY_PORT);
  logger.log("Api gateway is running on port " + process.env.API_GATEWAY_PORT);
}
bootstrap();
