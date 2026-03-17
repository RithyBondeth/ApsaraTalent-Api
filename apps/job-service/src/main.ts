import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { JobServiceModule } from './job-service.module';

async function bootstrap() {
  const appContext =
    await NestFactory.createApplicationContext(JobServiceModule);
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    JobServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: configService.get<string>('services.job.host'),
        port: configService.get<number>('services.job.port'),
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

  // Logger setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  const port = configService.get<number>('services.job.port');
  logger.log(`Job service is running on port ${port}`);

  // Close the app context
  await appContext.close();
}
bootstrap();
