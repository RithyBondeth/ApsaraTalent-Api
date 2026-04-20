import {
  DatabaseModule,
  EmailModule,
  LoggerModule,
  RedisCacheHealthIndicator,
} from '@app/common';
import { RedisModule } from '@app/common/redis/redis.module';
import { ConfigModule } from '@app/common/config';
import { Company } from '@app/common/database/entities/company/company.entity';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { User } from '@app/common/database/entities/user.entity';
import { MessageModule } from '@app/common/message/message.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { JobHealthController } from './health/health.controller';
import { InterviewController } from './controllers/interview.controller';
import { JobController } from './controllers/job-service.controller';
import { MatchingController } from './controllers/matching.controller';
import { InterviewService } from './services/interview.service';
import { JobService } from './services/job-service.service';
import { MatchingService } from './services/matching.service';
import {
  I_INTERVIEW_SERVICE,
  I_JOB_SERVICE_SERVICE,
  I_MATCHING_SERVICE,
} from '@app/contracts/interfaces/service/job-service.interface';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    LoggerModule,
    MessageModule,
    EmailModule,
    RedisModule,
    TerminusModule,
    ClientsModule.registerAsync([
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
    TypeOrmModule.forFeature([
      User,
      Company,
      Employee,
      Job,
      JobMatching,
      EmployeeFavoriteCompany,
      CompanyFavoriteEmployee,
      Interview,
    ]),
  ],
  controllers: [
    JobController,
    MatchingController,
    InterviewController,
    JobHealthController,
  ],
  providers: [
    { provide: I_JOB_SERVICE_SERVICE, useClass: JobService },
    { provide: I_MATCHING_SERVICE, useClass: MatchingService },
    { provide: I_INTERVIEW_SERVICE, useClass: InterviewService },
    RedisCacheHealthIndicator,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class JobServiceModule {}
