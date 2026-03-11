import {
    DatabaseModule,
    JwtModule,
    LoggerModule,
    UploadfileModule
} from '@app/common';
import { ConfigModule } from '@app/common/config';
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
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { CacheInvalidationService } from '@app/common/redis/cache-invalidation.service';
import { RedisModule } from '@app/common/redis/redis.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { UserController } from './controllers/user.controller';
import { FindCompanyService } from './services/company-services/find-company.service';
import { ImageCompanyService } from './services/company-services/image-company.service';
import { OpenPositionService } from './services/company-services/open-position.service';
import { UpdateCompanyInfoService } from './services/company-services/update-company-info.service';
import { ExperienceAndEducationService } from './services/employee-services/experienc-education.service';
import { FindEmployeeService } from './services/employee-services/find-employee.service';
import { ImageEmployeeService } from './services/employee-services/image-employee.service';
import { SearchEmployeeService } from './services/employee-services/search-employee.service';
import { UpdateEmployeeInfoService } from './services/employee-services/update-employee-info.service';
import { UploadEmployeeReferenceService } from './services/employee-services/upload-employee-reference.service';
import { UserService } from './services/user.service';

@Module({
  imports: [
    ConfigModule,
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
    ]),
    LoggerModule,
    UploadfileModule,
    JwtModule,
    RedisModule,
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
    OpenPositionController,
    ExperienceAndEducationController,
  ],
  providers: [
    UpdateEmployeeInfoService,
    ImageEmployeeService,
    UpdateCompanyInfoService,
    FindEmployeeService,
    FindCompanyService,
    ImageCompanyService,
    UploadEmployeeReferenceService,
    SearchEmployeeService,
    UserService,
    OpenPositionService,
    ExperienceAndEducationService,
    CacheInvalidationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class UserServiceModule {}
