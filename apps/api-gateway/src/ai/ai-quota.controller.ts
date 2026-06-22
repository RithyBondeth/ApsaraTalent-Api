import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  AiQuotaService,
  AiQuotaUsage,
} from '@app/common/throttler/ai-quota.service';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';

/**
 * Exposes the authenticated user's current AI usage so the web can render a
 * proactive "X of N AI uses left today" indicator. Read-only — does not consume
 * quota (that only happens on the actual AI endpoints via AiQuotaGuard).
 */
@Controller('ai')
@UseGuards(AuthGuard)
export class AiQuotaController {
  constructor(private readonly aiQuota: AiQuotaService) {}

  @Get('quota')
  async getQuota(@Req() req: any): Promise<AiQuotaUsage> {
    return this.aiQuota.getUsage(req.user.id);
  }
}
