import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import {
  HealthCheck,
  HealthCheckService,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  checkHealth() {
    return this.health.check([
      () =>
        this.microservice.pingCheck(AUTH_SERVICE.NAME, {
          transport: Transport.TCP,
          options: {
            host: this.configService.get<string>('AUTH_SERVICE_HOST'),
            port: this.configService.get<number>('AUTH_SERVICE_PORT'),
          },
        }),
      () =>
        this.microservice.pingCheck(USER_SERVICE.NAME, {
          transport: Transport.TCP,
          options: {
            host: this.configService.get<string>('USER_SERVICE_HOST'),
            port: this.configService.get<number>('USER_SERVICE_PORT'),
          },
        }),
    ]);
  }
}
