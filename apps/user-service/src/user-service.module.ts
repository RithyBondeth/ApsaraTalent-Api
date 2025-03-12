import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, LoggerModule, UploadfileModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entiry';
import { Employee } from '@app/common/database/entities/employee/employee.entiry';
import { Company } from '@app/common/database/entities/company/company.entity';
import { ImageEmployeeController } from './controllers/employee-controllers/image-employee.controller';
import { ImageEmployeeService } from './services/employee-services/image-employee.service';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UpdateEmployeeInfoController } from './controllers/employee-controllers/update-employee-info.controller';
import { UpdateEmployeeInfoService } from './services/employee-services/update-employee-info.service';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { Experience } from '@app/common/database/entities/employee/experince.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { UpdateCompanyInfoController } from './controllers/company-controllers/update-company-info.controller';
import { UpdateCompanyInfoService } from './services/company-services/update-company-info.service';
import { FindEmployeeController } from './controllers/employee-controllers/find-employee.controller';
import { FindEmployeeService } from './services/employee-services/find-employee.service';
import { FindCompanyController } from './controllers/company-controllers/find-company.controller';
import { FindCompanyService } from './services/company-services/find-company.service';
import { ImageCompanyController } from './controllers/company-controllers/image-company.controller';
import { ImageCompanyService } from './services/company-services/image-company.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/user-service/.env',
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([ User, Company, Employee, Skill, CareerScope, Benefit, Value, Social, Experience, Education, Job ]),
    LoggerModule,
    UploadfileModule,
  ],
  controllers: [
    UpdateEmployeeInfoController,
    ImageEmployeeController, 
    UpdateCompanyInfoController,
    FindEmployeeController,
    FindCompanyController,
    ImageCompanyController,
    UserController
  ],
  providers: [
    UpdateEmployeeInfoService,
    ImageEmployeeService,
    UpdateCompanyInfoService,
    FindEmployeeService,
    FindCompanyService,
    ImageCompanyService,
    UserService
  ],
})
export class UserServiceModule {}
