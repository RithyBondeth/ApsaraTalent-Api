import { AuthGuard } from '@app/common/guards/auth.guard';
import { AiQuotaService } from '@app/common/throttler/ai-quota.service';
import { IAiQuotaUsage } from '@app/contracts/interfaces/domain/ai.interface';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiQuotaController {
  constructor(private readonly aiQuota: AiQuotaService) {}

  @Get('quota')
  async getQuota(@Req() req: any): Promise<IAiQuotaUsage> {
    return this.aiQuota.getUsage(req.user.id);
  }
}
