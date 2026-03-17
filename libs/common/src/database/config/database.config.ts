<<<<<<< HEAD
import { ConfigService } from "@nestjs/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { User } from "../entities/user.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { JobPosting } from "../entities/job-posting.entity";
import { Message } from "../entities/message.entity";
import { Match } from "../entities/match.entity";
import { Career } from "../entities/career.entity";

export const databaseConfig = async (configService: ConfigService): Promise<PostgresConnectionOptions> => ({
    type: 'postgres',
    url: configService.get<string>('DATABASE_URL'),
    synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE'),
    entities: [User, UserProfile, JobPosting, Message, Match, Career],
});
=======
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
import { PaymentTransaction } from '../entities/payment/payment-transaction.entity';
import { Payment } from '../entities/payment/payment.entity';
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
    //  Payment,
    //PaymentTransaction,
  ],
});
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
