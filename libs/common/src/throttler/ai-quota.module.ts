import { Global, Module } from '@nestjs/common';
import { AiQuotaService } from './ai-quota.service';

@Global()
@Module({
  providers: [AiQuotaService],
  exports: [AiQuotaService],
})
export class AiQuotaModule {}
