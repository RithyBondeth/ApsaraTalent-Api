import { ConfigService } from "@nestjs/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { User } from "../entities/user.entiry";
import { Employee } from "../entities/employee/employee.entiry";
import { Company } from "../entities/company/company.entity";
import { Social } from "../entities/social.entity";
import { Message } from "../entities/message.entity";
import { JobMatching } from "../entities/job-matching.entity";
import { CareerScope } from "../entities/career-scope.entity";
import { Education } from "../entities/employee/education.entity";
import { Experience } from "../entities/employee/experince.entity";
import { Skill } from "../entities/employee/skill.entity";
import { Benefit } from "../entities/company/benefit.entity";
import { Job } from "../entities/company/job.entity";
import { Value } from "../entities/company/value.entity";

export const databaseConfig = async (configService: ConfigService): Promise<PostgresConnectionOptions> => ({
    type: 'postgres',
    url: configService.get<string>('DATABASE_URL'),
    synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE'),
    entities: [User, Employee, Company, Social, Message, JobMatching, CareerScope, Education, Experience, Skill, Benefit, Job, Value],
});