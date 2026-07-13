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
import { Interview } from '../entities/interview.entity';
import { JobMatching } from '../entities/job-matching.entity';
import { UserBlock } from '../entities/moderation/user-block.entity';
import { UserReport } from '../entities/moderation/user-report.entity';
import { Notification } from '../entities/notification.entity';
import { ResumeTemplate } from '../entities/resume-template.entity';
import { Social } from '../entities/social.entity';
import { User } from '../entities/user.entity';
import { Application } from '../entities/application.entity';

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
    Interview,
    UserBlock,
    UserReport,
    Application,
  ],
  // Load relations as separate batched queries instead of a single multi-join.
  // This prevents the cartesian-product row explosion (and embedding/column
  // duplication) that happens when an entity is loaded with several collection
  // relations at once via find({ relations: [...] }) or eager: true.
  relationLoadStrategy: 'query',
  // Log any query slower than 1s so slow paths are visible before they 504.
  maxQueryExecutionTime: 1000,
  // Connection pool optimized for Neon PostgreSQL (remote, high-latency)
  extra: {
    max: 20, // Max pool connections (default was 10)
    min: 2, // Keep 2 warm connections ready
    idleTimeoutMillis: 60000, // Close idle connections after 60s
    connectionTimeoutMillis: 10000, // Wait up to 10s for connection (default 1s)
    // Postgres kills any single statement that runs longer than 15s so a
    // runaway query can never hold a pooled connection hostage.
    statement_timeout: 15000,
  },
});
