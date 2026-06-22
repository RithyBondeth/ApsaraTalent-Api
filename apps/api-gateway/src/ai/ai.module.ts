import { JwtModule } from '@app/common';
import { Module } from '@nestjs/common';
import { AiQuotaController } from './ai-quota.controller';

/**
 * Gateway-only module for AI utility endpoints (currently the usage/quota
 * lookup). JwtModule supplies the AuthGuard + User repository; AiQuotaService
 * comes from the global AiQuotaModule.
 */
@Module({
  imports: [JwtModule],
  controllers: [AiQuotaController],
})
export class AiModule {}
