import { SetMetadata } from '@nestjs/common';
import { TAiQuotaAction } from '@app/contracts/interfaces/domain/ai.interface';

export const AI_QUOTA_ACTION_KEY = 'ai_quota_action';

/**
 * Attach a per-action daily cap to a route, enforced by `AiQuotaGuard` on top
 * of the global burst + daily quota. Use on the expensive AI endpoints.
 */
export const AiQuotaAction = (action: TAiQuotaAction) =>
  SetMetadata(AI_QUOTA_ACTION_KEY, action);
