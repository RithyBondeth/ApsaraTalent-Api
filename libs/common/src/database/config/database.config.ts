import { ConfigService } from "@nestjs/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { User } from "../entities/user.entity";

export const databaseConfig = async (configService: ConfigService): Promise<PostgresConnectionOptions> => ({
    type: 'postgres',
    url: configService.get<string>('DATABASE_URL'),
    synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE'),
    entities: [User],
});