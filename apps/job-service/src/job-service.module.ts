import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { JobServiceService } from './services/job-service.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, LoggerModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { User } from '@app/common/database/entities/user.entity';
import { JobServiceController } from './controllers/job-service.controller';
import { MessageModule } from '@app/common/message/message.module';
import { MatchingController } from './controllers/matching.controller';
import { MatchingService } from './services/matching.service';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/job-service/.env',
    }),
    DatabaseModule,
    LoggerModule,
    MessageModule,
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
