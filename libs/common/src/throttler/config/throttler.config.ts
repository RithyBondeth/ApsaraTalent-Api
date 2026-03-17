<<<<<<< HEAD
import { ConfigService } from "@nestjs/config";
import { ThrottlerModuleOptions } from "@nestjs/throttler";

export const throttlerConfig = async (configService: ConfigService): Promise<ThrottlerModuleOptions> => ({
    throttlers: [{
        ttl: configService.get<number>('THROTTLE_TTL'),
        limit: configService.get<number>('THROTTLE_LIMIT'),
    }]
});
=======
import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig = async (
  configService: ConfigService,
): Promise<ThrottlerModuleOptions> => ({
  throttlers: [
    {
      ttl: configService.get<number>('throttle.ttl'),
      limit: configService.get<number>('throttle.limit'),
    },
  ],
});
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
