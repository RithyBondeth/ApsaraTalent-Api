import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: './libs/.env',
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: databaseConfig,
        })
    ]
})
export class DatabaseModule {}
