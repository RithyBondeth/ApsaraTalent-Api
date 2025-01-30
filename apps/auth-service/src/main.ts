import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { Logger } from 'nestjs-pino';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Microservices setup
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthServiceModule, {
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: 3001,
    }
  })
  
  // Logger setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  logger.log("Auth service is running on port " + process.env.AUTH_SERVICE_PORT);
}
bootstrap();
