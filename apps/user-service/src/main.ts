import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';
import { Logger } from 'nestjs-pino';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Microservices setup
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(UserServiceModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3002,
    }
  });

  const configService = app.get(ConfigService);

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

  //Setup Logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  logger.log('User service is running on port ', configService.get('USER_SERVICE_PORT'));
}
bootstrap();
