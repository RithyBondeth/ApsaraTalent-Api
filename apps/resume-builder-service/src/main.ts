import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { ResumeBuilderServiceModule } from './resume-builder-service.module';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    ResumeBuilderServiceModule,
  );
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ResumeBuilderServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: configService.get<string>('services.resume.host'),
        port: configService.get<number>('services.resume.port'),
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
  const port = configService.get<number>('services.resume.port');
  logger.log(`Resume service is running on port ${port}`);

  // Close the app context
  await appContext.close();
}
bootstrap();
