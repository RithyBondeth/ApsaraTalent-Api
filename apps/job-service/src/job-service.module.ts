import { DatabaseModule, EmailModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { User } from '@app/common/database/entities/user.entity';
import { MessageModule } from '@app/common/message/message.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobServiceController } from './controllers/job-service.controller';
import { MatchingController } from './controllers/matching.controller';
import { JobServiceService } from './services/job-service.service';
import { MatchingService } from './services/matching.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    LoggerModule,
    MessageModule,
    EmailModule,
    TypeOrmModule.forFeature([User, Company, Employee, Job, JobMatching]),
  ],
  controllers: [JobServiceController, MatchingController],
  providers: [
    JobServiceService,
    MatchingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class JobServiceModule {}
