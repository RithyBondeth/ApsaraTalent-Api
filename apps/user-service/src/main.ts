import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { UserServiceModule } from './user-service.module';

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
        host: '0.0.0.0',
        port: configService.get<number>('services.user.port'),
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
  const port = configService.get<number>('services.user.port');
  logger.log(`User service is running on port ${port}`);

  // Close the app context
  await appContext.close();
}
bootstrap();
