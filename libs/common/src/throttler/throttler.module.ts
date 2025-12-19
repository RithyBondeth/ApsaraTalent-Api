import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule as NestThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from './config/throttler.config';

@Module({
  imports: [
    NestThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: throttlerConfig,
    }),
  ],
  exports: [NestThrottlerModule],
})
export class ThrottlerModule {}
