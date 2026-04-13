import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { GlobalRpcExceptionFilter } from '@app/common';
import { JobServiceModule } from './job-service.module';

async function bootstrap() {
  // First, create the application context to access the ConfigService
  const appContext =
    await NestFactory.createApplicationContext(JobServiceModule);
  const configService = appContext.get(ConfigService);

  // =========================================================
  // 1. MICROSERVICE SETUP
  // =========================================================

  const host = '0.0.0.0';
  const port = configService.get<number>('services.job.port');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    JobServiceModule,
    {
      transport: Transport.TCP,
      options: { host, port },
    },
  );

  // =========================================================
  // 2. GLOBAL CONFIGURATION
  // =========================================================

  // Handle RPC exceptions globally across the microservice
  app.useGlobalFilters(new GlobalRpcExceptionFilter());

  // Ensure request payload validation and transformation via DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips non-DTO properties automatically
      transform: true, // Transforms payloads to instances of their DTO classes
      transformOptions: {
        enableImplicitConversion: true, // Automatically convert primitive types
      },
      forbidNonWhitelisted: true,
      enableDebugMessages: process.env.NODE_ENV !== 'production',
    }),
  );

  // =========================================================
  // 3. LOGGER & BOOTSTRAP
  // =========================================================

  // Attach centralized logging via nestjs-pino
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Expose the microservice to the network
  await app.listen();
  logger.log(`Job service is running on port ${port}`);

  // Close the initial app context as it's no longer needed
  await appContext.close();
}
bootstrap();
