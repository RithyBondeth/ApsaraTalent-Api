import { NestFactory } from '@nestjs/core';
import { JobServiceModule } from './job-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(JobServiceModule);
  const configService = appContext.get(ConfigService);
  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(JobServiceModule, {
    transport: Transport.TCP,
    options: {
      host: configService.get('services.job.host', 'localhost'),
      port: configService.get('services.job.port', 3005),
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
  const port = configService.get('services.job.port', 3005);
  logger.log(`Job service is running on port ${port}`);
  
  // Close the app context
  await appContext.close();
}
bootstrap();
