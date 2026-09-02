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
import { AdminAuditLog } from '@app/common/database/entities/moderation/admin-audit-log.entity';
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
import { FindCompanyController } from './company/controllers/find-company.controller';
import { ImageCompanyController } from './company/controllers/image-company.controller';
import { OpenPositionController } from './company/controllers/open-position.controller';
import { UpdateCompanyInfoController } from './company/controllers/update-company-info.controller';
import { ExperienceAndEducationController } from './employee/controllers/experience-education.controller';
import { FindEmployeeController } from './employee/controllers/find-employee.controller';
import { ImageEmployeeController } from './employee/controllers/image-employee.controller';
import { SearchEmployeeController } from './employee/controllers/search-employee.controller';
import { UpdateEmployeeInfoController } from './employee/controllers/update-employee-info.controller';
import { UploadEmployeeReferenceController } from './employee/controllers/upload-employee-reference.controller';
import { EmailModule } from '@app/common/email/email.module';
import { AdminController } from './admin/controllers/admin.controller';
import { ModerationController } from './moderation/controllers/moderation.controller';
import { SupportController } from './support/controllers/support.controller';
import { UserController } from './users/controllers/user.controller';
import { UserHealthController } from './health/health.controller';
import { FindCompanyService } from './company/services/find-company.service';
import { ImageCompanyService } from './company/services/image-company.service';
import { OpenPositionService } from './company/services/open-position.service';
import { UpdateCompanyInfoService } from './company/services/update-company-info.service';
import { ExperienceAndEducationService } from './employee/services/experience-education.service';
import { FindEmployeeService } from './employee/services/find-employee.service';
import { ImageEmployeeService } from './employee/services/image-employee.service';
import { SearchEmployeeService } from './employee/services/search-employee.service';
import { UpdateEmployeeInfoService } from './employee/services/update-employee-info.service';
import { UploadEmployeeReferenceService } from './employee/services/upload-employee-reference.service';
import { AdminAuditService } from './admin/services/admin-audit.service';
import { AdminJobService } from './admin/services/admin-job.service';
import { AdminReportService } from './admin/services/admin-report.service';
import { AdminUserService } from './admin/services/admin-user.service';
import { ModerationService } from './moderation/services/moderation.service';
import { SupportService } from './support/services/support.service';
import { UserService } from './users/services/user.service';
import { FavoritesService } from './users/services/favorites.service';
import { FavoritesQueryService } from './users/services/favorites-query.service';
import { EmployeeRecommendationsService } from './users/services/employee-recommendations.service';
import { CompanyRecommendationsService } from './users/services/company-recommendations.service';
import { RecommendationSupportService } from './users/services/recommendation-support.service';
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
  I_FAVORITES_SERVICE,
  I_FAVORITES_QUERY_SERVICE,
  I_EMPLOYEE_RECOMMENDATIONS_SERVICE,
  I_COMPANY_RECOMMENDATIONS_SERVICE,
  I_OPEN_POSITION_SERVICE,
  I_EXPERIENCE_AND_EDUCATION_SERVICE,
  I_MODERATION_SERVICE,
  I_SUPPORT_SERVICE,
  I_ADMIN_USER_SERVICE,
  I_ADMIN_REPORT_SERVICE,
  I_ADMIN_JOB_SERVICE,
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
      AdminAuditLog,
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
    AdminController,
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
    { provide: I_FAVORITES_SERVICE, useClass: FavoritesService },
    {
      provide: I_FAVORITES_QUERY_SERVICE,
      useClass: FavoritesQueryService,
    },
    RecommendationSupportService,
    {
      provide: I_EMPLOYEE_RECOMMENDATIONS_SERVICE,
      useClass: EmployeeRecommendationsService,
    },
    {
      provide: I_COMPANY_RECOMMENDATIONS_SERVICE,
      useClass: CompanyRecommendationsService,
    },
    { provide: I_OPEN_POSITION_SERVICE, useClass: OpenPositionService },
    {
      provide: I_EXPERIENCE_AND_EDUCATION_SERVICE,
      useClass: ExperienceAndEducationService,
    },
    { provide: I_MODERATION_SERVICE, useClass: ModerationService },
    { provide: I_SUPPORT_SERVICE, useClass: SupportService },
    AdminAuditService,
    { provide: I_ADMIN_USER_SERVICE, useClass: AdminUserService },
    { provide: I_ADMIN_REPORT_SERVICE, useClass: AdminReportService },
    { provide: I_ADMIN_JOB_SERVICE, useClass: AdminJobService },
    CacheInvalidationService,
    RedisCacheHealthIndicator,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class UserServiceModule {}
