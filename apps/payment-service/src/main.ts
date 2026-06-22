// Sentry must initialize before any other import (no-op without SENTRY_DSN).
import '@app/common/sentry/instrument';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { GlobalRpcExceptionFilter } from '@app/common';
import { PaymentServiceModule } from './payment-service.module';

async function bootstrap() {
  // Hybrid app: a small HTTP server (for the Prometheus /metrics endpoint) plus
  // the TCP microservice that serves RPC from the gateway.
  const app = await NestFactory.create(PaymentServiceModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('services.payment.port');
  const metricsPort = configService.get<number>('services.payment.metricsPort');

  // =========================================================
  // 1. MICROSERVICE TRANSPORT
  // =========================================================
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port },
    },
    // Apply the app-level global pipes/filters to RPC handlers too.
    { inheritAppConfig: true },
  );

  // =========================================================
  // 2. GLOBAL CONFIGURATION
  // =========================================================
  app.useGlobalFilters(new GlobalRpcExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
      enableDebugMessages: process.env.NODE_ENV !== 'production',
    }),
  );

  // =========================================================
  // 3. LOGGER & BOOTSTRAP
  // =========================================================
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.startAllMicroservices();
  await app.listen(metricsPort);
  logger.log(
    `Payment service running (RPC TCP ${port}, metrics http://0.0.0.0:${metricsPort}/metrics)`,
  );
}
bootstrap();
