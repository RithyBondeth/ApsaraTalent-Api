import { JwtModule } from '@app/common';
import { Global, Module } from '@nestjs/common';
import { AiQuotaController } from './controllers/ai-quota.controller';
import { AiStreamService } from './services/ai-stream.service';

/**
 * AI concerns for the gateway: the per-user quota endpoint, and the streaming
 * helper that the resume-builder and job features use to relay model output.
 *
 * Global because AiStreamService is consumed by other feature modules — the
 * same reach the standalone AiStreamModule had before the two were merged.
 */
@Global()
@Module({
  imports: [JwtModule],
  controllers: [AiQuotaController],
  providers: [AiStreamService],
  exports: [AiStreamService],
})
export class AiModule { }
