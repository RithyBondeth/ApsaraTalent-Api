import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
<<<<<<< HEAD
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Microservices setup
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AuthServiceModule, {
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: 3001,
    }
  })
  
  // Pipe Validation Setup
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
=======
import { Logger } from 'nestjs-pino';
import { AuthServiceModule } from './auth-service.module';

async function bootstrap() {
  const appContext =
    await NestFactory.createApplicationContext(AuthServiceModule);
  const configService = appContext.get(ConfigService);

  // Microservices setup with env variables
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: configService.get<string>('services.auth.host'),
        port: configService.get<number>('services.auth.port'),
      },
    },
  );

  // Pipe Validation Setup
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: true,
      enableDebugMessages: true,
<<<<<<< HEAD
  }));
=======
    }),
  );
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af

  // Logger setup
  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.listen();
  const port = configService.get<number>('services.auth.port');
  logger.log(`Auth service is running on port ${port}`);

  // Close the app context
  await appContext.close();
}
bootstrap();
