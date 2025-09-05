import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ChatServiceModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3004,
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
  
  // Logger setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  logger.log('Chat service is running on port ', configService.get('CHAT_SERVICE_PORT'));
}
bootstrap();
