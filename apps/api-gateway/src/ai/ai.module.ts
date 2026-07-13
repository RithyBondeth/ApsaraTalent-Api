import { JwtModule } from '@app/common';
import { Module } from '@nestjs/common';
import { AiQuotaController } from './ai-quota.controller';

@Module({
  imports: [JwtModule],
  controllers: [AiQuotaController],
})
export class AiModule {}
