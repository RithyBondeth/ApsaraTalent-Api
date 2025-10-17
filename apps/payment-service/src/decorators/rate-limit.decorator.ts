import { SetMetadata } from '@nestjs/common';

export const RateLimit = (limit: number) => SetMetadata('rateLimit', limit);
