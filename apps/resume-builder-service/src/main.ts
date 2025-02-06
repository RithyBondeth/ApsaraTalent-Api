import { NestFactory } from '@nestjs/core';
import { ResumeBuilderServiceModule } from './resume-builder-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ResumeBuilderServiceModule, {
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: 3003,
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
    logger.log("Auth service is running on port " + process.env.AUTH_SERVICE_PORT);
}
bootstrap();
