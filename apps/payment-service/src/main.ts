import { NestFactory } from '@nestjs/core';
import { PaymentServiceModule } from './payment-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(PaymentServiceModule);
  const configService = appContext.get(ConfigService);
  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(PaymentServiceModule, {
    transport: Transport.TCP,
    options: {
      host: configService.get('services.payment.host', 'localhost'),
      port: configService.get('services.payment.port', 3006),
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
  const port = configService.get('services.payment.port');
  logger.log(`Payment service is running on port ${port}`);
}
bootstrap();
