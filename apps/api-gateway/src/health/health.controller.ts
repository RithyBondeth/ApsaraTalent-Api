import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckError,
  HealthIndicatorService,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { CHAT_SERVICE } from '@app/contracts/constants/chat-service.constant';
import { JOB_SERVICE } from '@app/contracts/constants/job-service.constant';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/notification.constant';
import { PAYMENT_SERVICE } from '@app/contracts/constants/payment-service.constant';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/resume-builder-service.constant';
import { USER_SERVICE } from '@app/contracts/constants/user-service.constant';
import { IHealthController } from '@app/contracts/interfaces/health.interface';
import { RedisCacheHealthIndicator } from './indicators/redis-cache.health';

type TcpServiceConfig = {
  name: string;
  hostKey: string;
  portKey: string;
};

const MICROSERVICE_TIMEOUT_MS = 2500;
const DATABASE_TIMEOUT_MS = 2500;
const TCP_SERVICES: TcpServiceConfig[] = [
  {
    name: AUTH_SERVICE.NAME,
    hostKey: 'services.auth.host',
    portKey: 'services.auth.port',
  },
  {
    name: USER_SERVICE.NAME,
    hostKey: 'services.user.host',
    portKey: 'services.user.port',
  },
  {
    name: RESUME_BUILDER_SERVICE.NAME,
    hostKey: 'services.resume.host',
    portKey: 'services.resume.port',
  },
  {
    name: CHAT_SERVICE.NAME,
    hostKey: 'services.chat.host',
    portKey: 'services.chat.port',
  },
  {
    name: JOB_SERVICE.NAME,
    hostKey: 'services.job.host',
    portKey: 'services.job.port',
  },
  {
    name: PAYMENT_SERVICE.NAME,
    hostKey: 'services.payment.host',
    portKey: 'services.payment.port',
  },
  {
    name: NOTIFICATION_SERVICE.NAME,
    hostKey: 'services.notification.host',
    portKey: 'services.notification.port',
  },
];

@Controller('health')
export class HealthController implements IHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redisCache: RedisCacheHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  checkHealth() {
    return this.runReadinessChecks();
  }

  @Get('ready')
  @HealthCheck()
  checkReadiness() {
    return this.runReadinessChecks();
  }

  @Get('live')
  checkLiveness() {
    return {
      status: 'ok',
      service: 'api-gateway',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private runReadinessChecks() {
    return this.health.check([
      () =>
        this.database.pingCheck('database', {
          timeout: DATABASE_TIMEOUT_MS,
        }),
      () => this.redisCache.pingCheck('redis_cache'),
      ...TCP_SERVICES.map((service) => () => this.pingTcpService(service)),
    ]);
  }

  private pingTcpService(service: TcpServiceConfig) {
    const host = this.configService.get<string>(service.hostKey);
    const port = this.configService.get<number>(service.portKey);
    const indicator = this.healthIndicatorService.check(service.name);

    if (!host || !port) {
      throw new HealthCheckError(
        `${service.name} health configuration is missing`,
        indicator.down({
          message: `Missing ${service.hostKey} or ${service.portKey}`,
        }),
      );
    }

    return this.microservice.pingCheck(service.name, {
      transport: Transport.TCP,
      timeout: MICROSERVICE_TIMEOUT_MS,
      options: {
        host,
        port,
      },
    });
  }
}
