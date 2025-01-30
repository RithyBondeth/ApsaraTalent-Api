import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';
import { Logger } from 'nestjs-pino';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Microservices setup
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(UserServiceModule, {
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: 3002,
    }
  })

  //Setup Logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  logger.log('User service is runing on port ', process.env.USER_SERVICE_PORT);
}
bootstrap();
