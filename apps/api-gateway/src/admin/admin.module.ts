import { JwtModule } from '@app/common';
import { AdminGuard } from '@app/common/guards/admin.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AdminJobController } from './controllers/admin-job.controller';
import { AdminReportController } from './controllers/admin-report.controller';
import { AdminProblemReportController } from './controllers/admin-problem-report.controller';
import { AdminUserController } from './controllers/admin-user.controller';

/**
 * Gateway-owned, like `health` and `storage` — it is an HTTP surface over data
 * the user service already owns, not a mapping onto a backend service of its
 * own. There is deliberately no `admin-service`: the platform runs seven
 * deployables already, a full deploy costs about eighty seconds of downtime,
 * and an eighth process for a handful of low-traffic reads over tables it does
 * not own would have to either reach across service boundaries or grow a
 * second copy of the user service's queries.
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
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
    ]),
    JwtModule,
  ],
  controllers: [
    AdminUserController,
    AdminReportController,
    AdminProblemReportController,
    AdminJobController,
  ],
  providers: [AdminGuard],
})
export class AdminModule {}
