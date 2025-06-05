import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { Logger } from 'nestjs-pino';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Microservices setup
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthServiceModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.AUTH_SERVICE_HOST,
      port: Number(process.env.AUTH_SERVICE_PORT),
    }
  })
  
  // Pipe Validation Setup
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
      enableDebugMessages: true,
  }));

  // Logger setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  logger.log("Auth service is running on port " + process.env.AUTH_SERVICE_PORT);
}
bootstrap();
