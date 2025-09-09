import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(ChatServiceModule);
  const configService = appContext.get(ConfigService);
  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ChatServiceModule, {
    transport: Transport.TCP,
    options: {
      host: configService.get('services.chat.host', 'localhost'),
      port: configService.get('services.chat.port', 3004),
    }
  });

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
  const port = configService.get('services.chat.port', 3004);
  logger.log(`Chat service is running on port ${port}`);
  
  // Close the app context
  await appContext.close();
}
bootstrap();
