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