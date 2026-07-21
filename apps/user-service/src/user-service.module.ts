import {
  DatabaseModule,
  EmbeddingModule,
  JwtModule,
  LoggerModule,
  RedisCacheHealthIndicator,
  UploadfileModule,
  VectorColumnsModule,
} from '@app/common';
import { ConfigModule } from '@app/common/config';
import { MetricsModule } from '@app/common/metrics/metrics.module';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { Image } from '@app/common/database/entities/company/image.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { UserBlock } from '@app/common/database/entities/moderation/user-block.entity';
import { UserReport } from '@app/common/database/entities/moderation/user-report.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import { RedisModule } from '@app/common/redis/redis.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FindCompanyController } from './controllers/company-controllers/find-company.controller';
import { ImageCompanyController } from './controllers/company-controllers/image-company.controller';
import { OpenPositionController } from './controllers/company-controllers/open-position.controller';
import { UpdateCompanyInfoController } from './controllers/company-controllers/update-company-info.controller';
import { ExperienceAndEducationController } from './controllers/employee-controllers/experience-education.controller';
import { FindEmployeeController } from './controllers/employee-controllers/find-employee.controller';
import { ImageEmployeeController } from './controllers/employee-controllers/image-employee.controller';
import { SearchEmployeeController } from './controllers/employee-controllers/search-employee.controller';
import { UpdateEmployeeInfoController } from './controllers/employee-controllers/update-employee-info.controller';
import { UploadEmployeeReferenceController } from './controllers/employee-controllers/upload-employee-reference.controller';
import { EmailModule } from '@app/common/email/email.module';
import { ModerationController } from './controllers/moderation/moderation.controller';
import { SupportController } from './controllers/support/support.controller';
import { UserController } from './controllers/user.controller';
import { UserHealthController } from './health/health.controller';
import { FindCompanyService } from './services/company-services/find-company.service';
import { ImageCompanyService } from './services/company-services/image-company.service';
import { OpenPositionService } from './services/company-services/open-position.service';
import { UpdateCompanyInfoService } from './services/company-services/update-company-info.service';
import { ExperienceAndEducationService } from './services/employee-services/experience-education.service';
import { FindEmployeeService } from './services/employee-services/find-employee.service';
import { ImageEmployeeService } from './services/employee-services/image-employee.service';
import { SearchEmployeeService } from './services/employee-services/search-employee.service';
import { UpdateEmployeeInfoService } from './services/employee-services/update-employee-info.service';
import { UploadEmployeeReferenceService } from './services/employee-services/upload-employee-reference.service';
import { ModerationService } from './services/moderation/moderation.service';
import { SupportService } from './services/support/support.service';
import { UserService } from './services/user.service';
import {
  I_UPDATE_EMPLOYEE_INFO_SERVICE,
  I_IMAGE_EMPLOYEE_SERVICE,
  I_UPDATE_COMPANY_INFO_SERVICE,
  I_FIND_EMPLOYEE_SERVICE,
  I_FIND_COMPANY_SERVICE,
  I_IMAGE_COMPANY_SERVICE,
  I_UPLOAD_EMPLOYEE_REFERENCE_SERVICE,
  I_SEARCH_EMPLOYEE_SERVICE,
  I_USER_SERVICE,
  I_OPEN_POSITION_SERVICE,
  I_EXPERIENCE_AND_EDUCATION_SERVICE,
  I_MODERATION_SERVICE,
  I_SUPPORT_SERVICE,
} from '@app/contracts/interfaces/service/user-service.interface';

@Module({
  imports: [
    ConfigModule,
    MetricsModule,
    DatabaseModule,
    TypeOrmModule.forFeature([
      User,
      Company,
      Employee,
      Skill,
      CareerScope,
      Benefit,
      Value,
      Social,
      Experience,
      Education,
      Job,
      Image,
      EmployeeFavoriteCompany,
      CompanyFavoriteEmployee,
      JobMatching,
      UserBlock,
      UserReport,
    ]),
    LoggerModule,
    EmailModule,
    UploadfileModule,
    JwtModule,
    EmbeddingModule,
    VectorColumnsModule,
    RedisModule,
    TerminusModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  controllers: [
    UpdateEmployeeInfoController,
    ImageEmployeeController,
    UpdateCompanyInfoController,
    FindEmployeeController,
    FindCompanyController,
    ImageCompanyController,
    UploadEmployeeReferenceController,
    SearchEmployeeController,
    UserController,
    UserHealthController,
    OpenPositionController,
    ExperienceAndEducationController,
    ModerationController,
    SupportController,
  ],
  providers: [
    {
      provide: I_UPDATE_EMPLOYEE_INFO_SERVICE,
      useClass: UpdateEmployeeInfoService,
    },
    { provide: I_IMAGE_EMPLOYEE_SERVICE, useClass: ImageEmployeeService },
    {
      provide: I_UPDATE_COMPANY_INFO_SERVICE,
      useClass: UpdateCompanyInfoService,
    },
    { provide: I_FIND_EMPLOYEE_SERVICE, useClass: FindEmployeeService },
    { provide: I_FIND_COMPANY_SERVICE, useClass: FindCompanyService },
    { provide: I_IMAGE_COMPANY_SERVICE, useClass: ImageCompanyService },
    {
      provide: I_UPLOAD_EMPLOYEE_REFERENCE_SERVICE,
      useClass: UploadEmployeeReferenceService,
    },
    { provide: I_SEARCH_EMPLOYEE_SERVICE, useClass: SearchEmployeeService },
    { provide: I_USER_SERVICE, useClass: UserService },
    { provide: I_OPEN_POSITION_SERVICE, useClass: OpenPositionService },
    {
      provide: I_EXPERIENCE_AND_EDUCATION_SERVICE,
      useClass: ExperienceAndEducationService,
    },
    { provide: I_MODERATION_SERVICE, useClass: ModerationService },
    { provide: I_SUPPORT_SERVICE, useClass: SupportService },
    CacheInvalidationService,
    RedisCacheHealthIndicator,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class UserServiceModule {}
