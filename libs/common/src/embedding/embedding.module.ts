import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { EmbeddingService } from './embedding.service';

// RedisModule is @Global, so RedisService resolves without importing it here.
// Every app that registers EmbeddingModule (user-service, job-service via
// VectorColumnsModule) already registers RedisModule at its root.
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
