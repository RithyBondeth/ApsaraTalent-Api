import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { ConfigModule, ConfigService } from '@nestjs/config';
=======
import { ConfigService } from '@nestjs/config';
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
import { ThrottlerModule as NestThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from './config/throttler.config';

@Module({
<<<<<<< HEAD
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
=======
  imports: [
    NestThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: throttlerConfig,
    }),
  ],
  exports: [NestThrottlerModule],
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
})
export class ThrottlerModule {}
