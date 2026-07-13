import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA = 'rateLimit';
export const RateLimit = (limit: number) =>
  SetMetadata(RATE_LIMIT_METADATA, limit);
