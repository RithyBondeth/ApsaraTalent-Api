import { ConfigService } from "@nestjs/config";
import { StrategyOptions } from "passport-facebook";

export const facebookAuthConfig = (configService: ConfigService): StrategyOptions => ({
    clientID: configService.get<string>("FACEBOOK_CLIENT_ID"),
    clientSecret: configService.get<string>(""),
    callbackURL: configService.get<string>(""),
    profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    scope: ['email'],
});