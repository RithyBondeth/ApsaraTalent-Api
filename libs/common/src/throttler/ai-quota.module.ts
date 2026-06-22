import { Global, Module } from '@nestjs/common';
import { AiQuotaService } from './ai-quota.service';

/**
 * Provides AiQuotaService app-wide. Global so the AiQuotaGuard (registered per
 * feature module) and the GET /ai/quota controller can both inject it without
 * each importing this module. Relies on the global RedisModule/ConfigModule.
 */
@Global()
@Module({
  providers: [AiQuotaService],
  exports: [AiQuotaService],
})
export class AiQuotaModule {}
