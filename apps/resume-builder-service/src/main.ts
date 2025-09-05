import { NestFactory } from '@nestjs/core';
import { ResumeBuilderServiceModule } from './resume-builder-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino/Logger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ResumeBuilderServiceModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3003,
    },
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
    const port = configService.get('services.resume.port');
    logger.log(`Resume service is running on port ${port}`);
}
bootstrap();
