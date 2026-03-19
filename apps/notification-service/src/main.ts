import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { NotificationServiceModule } from './notification-service.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    NotificationServiceModule,
  );
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: configService.get<number>('services.notification.port'),
      },
    },
  );

  // Pipe Validation Setup
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
      enableDebugMessages: true,
    }),
  );

  // Logger Setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  const port = configService.get<string>('services.notification.port');
  logger.log(`Notification service is running on port ${port}`);

  // Close the app context
  await appContext.close();
}
bootstrap();
