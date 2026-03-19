import { ConfigService } from '@nestjs/config';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { CareerScope } from '../entities/career-scope.entity';
import { Chat } from '../entities/chat.entity';
import { Benefit } from '../entities/company/benefit.entity';
import { Company } from '../entities/company/company.entity';
import { CompanyFavoriteEmployee } from '../entities/company/favorite-employee.entity';
import { Image } from '../entities/company/image.entity';
import { Job } from '../entities/company/job.entity';
import { Value } from '../entities/company/value.entity';
import { Education } from '../entities/employee/education.entity';
import { Employee } from '../entities/employee/employee.entity';
import { Experience } from '../entities/employee/experience.entity';
import { EmployeeFavoriteCompany } from '../entities/employee/favorite-company.entity';
import { Skill } from '../entities/employee/skill.entity';
import { JobMatching } from '../entities/job-matching.entity';
import { Notification } from '../entities/notification.entity';
import { ResumeTemplate } from '../entities/resume-template.entity';
import { Social } from '../entities/social.entity';
import { User } from '../entities/user.entity';

export const databaseConfig = async (
  configService: ConfigService,
): Promise<PostgresConnectionOptions> => ({
  type: 'postgres',
  url: configService.get<string>('database.url'),
  synchronize: configService.get<boolean>('database.synchronize'),
  entities: [
    User,
    Employee,
    Company,
    Social,
    Chat,
    JobMatching,
    Notification,
    CareerScope,
    Education,
    Experience,
    Skill,
    Benefit,
    Job,
    Value,
    Image,
    ResumeTemplate,
    CompanyFavoriteEmployee,
    EmployeeFavoriteCompany,
  ],
});
