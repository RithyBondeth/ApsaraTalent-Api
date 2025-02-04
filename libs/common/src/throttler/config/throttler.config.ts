import { ConfigService } from "@nestjs/config";
import { ThrottlerModuleOptions } from "@nestjs/throttler";

export const throttlerConfig = async (configService: ConfigService): Promise<ThrottlerModuleOptions> => ({
    throttlers: [{
        ttl: configService.get<number>('THROTTLE_TTL'),
        limit: configService.get<number>('THROTTLE_LIMIT'),
    }]
});