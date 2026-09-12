import {
  DatabaseModule,
  LoggerModule,
  RedisCacheHealthIndicator,
  VectorColumnsModule,
} from '@app/common';
import { EmailModule } from '@app/common/email/email.module';
import { AnalyticsModule } from '@app/common/analytics';
import { RedisModule } from '@app/common/redis/redis.module';
import { ConfigModule } from '@app/common/config';
import { MetricsModule } from '@app/common/metrics/metrics.module';
import { Company } from '@app/common/database/entities/company/company.entity';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Application } from '@app/common/database/entities/application.entity';
import { ApplicationNote } from '@app/common/database/entities/application-note.entity';
import { ApplicationStatusHistory } from '@app/common/database/entities/application-status-history.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { SavedSearch } from '@app/common/database/entities/saved-search.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { User } from '@app/common/database/entities/user.entity';
import { MessageModule } from '@app/common/message/message.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { JobHealthController } from './health/health.controller';
import { ApplicationController } from './applications/controllers/application.controller';
import { InterviewController } from './interviews/controllers/interview.controller';
import { JobController } from './jobs/controllers/job-service.controller';
import { MatchingController } from './matching/controllers/matching.controller';
import { ApplicationService } from './applications/services/application.service';
import { InterviewService } from './interviews/services/interview.service';
import { InterviewReminderService } from './interviews/services/interview-reminder.service';
import { JobService } from './jobs/services/job-service.service';
import { MatchingService } from './matching/services/matching.service';
import { SavedSearchController } from './saved-searches/controllers/saved-search.controller';
import { SavedSearchService } from './saved-searches/services/saved-search.service';
import { SavedSearchDigestService } from './saved-searches/services/saved-search-digest.service';
import { EmployerAnalyticsController } from './employer-analytics/controllers/employer-analytics.controller';
import { EmployerAnalyticsService } from './employer-analytics/services/employer-analytics.service';
import { MatchLinkService } from './matching/services/match-link.service';
import { MatchingQueryService } from './matching/services/matching-query.service';
import { MatchingAnalyticsService } from './matching/services/matching-analytics.service';
import { MatchingAiService } from './matching/services/matching-ai.service';
import {
  I_APPLICATION_SERVICE,
  I_INTERVIEW_SERVICE,
  I_JOB_SERVICE_SERVICE,
  I_MATCHING_SERVICE,
  I_MATCHING_QUERY_SERVICE,
  I_MATCHING_ANALYTICS_SERVICE,
  I_MATCHING_AI_SERVICE,
  I_SAVED_SEARCH_SERVICE,
  I_EMPLOYER_ANALYTICS_SERVICE,
} from '@app/contracts/interfaces/service/job-service.interface';

@Module({
  imports: [
    ConfigModule,
    MetricsModule,
    DatabaseModule,
    LoggerModule,
    AnalyticsModule,
    MessageModule,
    VectorColumnsModule,
    RedisModule,
    // Saved-search digests hit the outbox through EmailService; the module
    // brings both the mailer and the outbox writer along for the ride.
    EmailModule,
    // Home to the interview-reminder cron and, now, the saved-search digest
    // dispatcher too.
    ScheduleModule.forRoot(),
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
      Application,
      ApplicationNote,
      ApplicationStatusHistory,
      JobMatching,
      EmployeeFavoriteCompany,
      CompanyFavoriteEmployee,
      Interview,
      SavedSearch,
    ]),
  ],
  controllers: [
    JobController,
    MatchingController,
    InterviewController,
    ApplicationController,
    SavedSearchController,
    EmployerAnalyticsController,
    JobHealthController,
  ],
  providers: [
    { provide: I_JOB_SERVICE_SERVICE, useClass: JobService },
    { provide: I_MATCHING_SERVICE, useClass: MatchingService },
    MatchLinkService,
    { provide: I_MATCHING_QUERY_SERVICE, useClass: MatchingQueryService },
    {
      provide: I_MATCHING_ANALYTICS_SERVICE,
      useClass: MatchingAnalyticsService,
    },
    { provide: I_MATCHING_AI_SERVICE, useClass: MatchingAiService },
    { provide: I_INTERVIEW_SERVICE, useClass: InterviewService },
    InterviewReminderService,
    { provide: I_APPLICATION_SERVICE, useClass: ApplicationService },
    // The dispatcher depends on the CRUD service to reuse `runSearch`, so the
    // concrete class is registered explicitly rather than only via the
    // interface token.
    SavedSearchService,
    { provide: I_SAVED_SEARCH_SERVICE, useExisting: SavedSearchService },
    SavedSearchDigestService,
    {
      provide: I_EMPLOYER_ANALYTICS_SERVICE,
      useClass: EmployerAnalyticsService,
    },
    RedisCacheHealthIndicator,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class JobServiceModule {}
