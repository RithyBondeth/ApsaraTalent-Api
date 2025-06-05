import { NestFactory } from '@nestjs/core';
import { ResumeBuilderServiceModule } from './resume-builder-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino/Logger';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ResumeBuilderServiceModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.RESUME_SERVICE_HOST,
      port: Number(process.env.RESUME_SERVICE_PORT),
    },
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
    //logger.log("Resume service is running on port " + process.env.RESUME_SERVICE_PORT);
}
bootstrap();
