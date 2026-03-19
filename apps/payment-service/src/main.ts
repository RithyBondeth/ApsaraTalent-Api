import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { PaymentServiceModule } from './payment-service.module';

async function bootstrap() {
  const appContext =
    await NestFactory.createApplicationContext(PaymentServiceModule);
  const configService = appContext.get(ConfigService);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: configService.get<number>('services.payment.port'),
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
  const port = configService.get('services.payment.port', 3006);
  logger.log(`Payment service is running on port ${port}`);

  // Close the app context
  await appContext.close();
}
bootstrap();
