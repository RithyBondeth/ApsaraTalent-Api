import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiClientService } from './ai-client.service';

/**
 * Global so the four services that issue completions (gateway, job,
 * resume-builder, and the gateway's auth resume parser) share one set of
 * pooled clients instead of each constructing their own.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [AiClientService],
  exports: [AiClientService],
})
export class AiClientModule {}
