import {
  DatabaseModule,
  RedisCacheHealthIndicator,
  RedisModule,
} from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import {
  AUTH_SERVICE,
  CHAT_SERVICE,
  JOB_SERVICE,
  NOTIFICATION_SERVICE,
  PAYMENT_SERVICE,
  RESUME_BUILDER_SERVICE,
  USER_SERVICE,
} from '@app/contracts/constants';
import { HealthController } from './controllers/health.controller';
import { InternalServiceHealthIndicator } from './indicators/internal-service.health';

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
    RedisModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.auth.host'),
            port: configService.get<number>('services.auth.port'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: USER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.user.host'),
            port: configService.get<number>('services.user.port'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: RESUME_BUILDER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.resume.host'),
            port: configService.get<number>('services.resume.port'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: CHAT_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.chat.host'),
            port: configService.get<number>('services.chat.port'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: JOB_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.job.host'),
            port: configService.get<number>('services.job.port'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: PAYMENT_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.payment.host'),
            port: configService.get<number>('services.payment.port'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: NOTIFICATION_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.notification.host'),
            port: configService.get<number>('services.notification.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [RedisCacheHealthIndicator, InternalServiceHealthIndicator],
})
export class HealthModule {}
