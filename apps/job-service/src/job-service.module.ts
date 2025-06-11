import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { JobServiceController } from './job-service.controller';
import { JobServiceService } from './job-service.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, LoggerModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { User } from '@app/common/database/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/job-service/.env',
    }),
    DatabaseModule,
    LoggerModule,
    TypeOrmModule.forFeature([User, Company, Employee, Job]),
  ],
  controllers: [JobServiceController],
  providers: [
    JobServiceService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class JobServiceModule {}
