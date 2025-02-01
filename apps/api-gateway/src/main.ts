import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  app.enableCors();
  
  //Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);
  logger.log("Api gateway is running on port " + process.env.API_GATEWAY_PORT);

  await app.listen(process.env.API_GATEWAY_PORT);
}
bootstrap();
