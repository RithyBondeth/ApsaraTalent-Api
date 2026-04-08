import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import {
  HealthCheck,
  HealthCheckService,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { USER_SERVICE } from '@app/contracts/constants/user-service.constant';
import { IHealthController } from '@app/contracts/interfaces/health.interface';

@Controller('health')
export class HealthController implements IHealthController {
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
            host: this.configService.get<string>('services.auth.host'),
            port: this.configService.get<number>('services.auth.port'),
          },
        }),
      () =>
        this.microservice.pingCheck(USER_SERVICE.NAME, {
          transport: Transport.TCP,
          options: {
            host: this.configService.get<string>('services.user.host'),
            port: this.configService.get<number>('services.user.port'),
          },
        }),
    ]);
  }
}
