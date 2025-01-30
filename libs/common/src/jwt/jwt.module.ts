import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { jwtConfig } from './config/jwt.config';
import { JwtService } from './jwt.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: './libs/.env',
        }),
        NestJwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: jwtConfig,
        })
    ],
    providers: [JwtService]
})
export class JwtModule {}
