import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule as NestThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from './config/throttler.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: './libs/.env',
        }),
        NestThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: throttlerConfig,
        })
    ],
    exports: [NestThrottlerModule]
})
export class ThrottlerModule {}
