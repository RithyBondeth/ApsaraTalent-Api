import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';
import { Logger } from 'nestjs-pino';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const appContext =
    await NestFactory.createApplicationContext(UserServiceModule);
  const configService = appContext.get(ConfigService);

  // Microservices setup
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: configService.get('services.user.host', 'localhost'),
        port: configService.get('services.user.port', 3002),
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

  //Setup Logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  const port = configService.get('services.user.port', 3002);
  logger.log(`User service is running on port ${port}`);

  // Close the app context
  await appContext.close();
}
bootstrap();
