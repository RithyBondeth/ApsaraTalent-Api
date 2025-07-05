import { ConfigService } from "@nestjs/config";
import { StrategyOption } from "passport-linkedin-oauth2";

export const linkedInConfig = (configService: ConfigService): StrategyOption => ({
    clientID: configService.get<string>('LINKEDIN_CLIENT_ID'),
    clientSecret: configService.get<string>('LINKEDIN_CLIENT_SECRET'),
    callbackURL: configService.get<string>('LINKEDIN_CALLBACK_URL'),
    scope: ['openid', 'email', 'profile'],
});