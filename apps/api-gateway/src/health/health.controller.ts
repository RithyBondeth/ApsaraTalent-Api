import { Controller, Get } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { HealthCheck, HealthCheckService, MicroserviceHealthIndicator } from '@nestjs/terminus';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly microservice: MicroserviceHealthIndicator,
    ) {}   

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.microservice.pingCheck(AUTH_SERVICE.NAME, {
                transport: Transport.TCP,
                options: { host: 'localhost', port: 3001 }
            }),
            () => this.microservice.pingCheck(USER_SERVICE.NAME, {
                transport: Transport.TCP,
                options: { host: 'localhost', port: 3002 }
            }),
        ]);
    }   
}
