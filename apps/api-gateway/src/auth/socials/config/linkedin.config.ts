<<<<<<< HEAD
import { ConfigService } from "@nestjs/config";
import { StrategyOption } from "passport-linkedin-oauth2";

export const linkedInConfig = (configService: ConfigService): StrategyOption => ({
    clientID: configService.get<string>('LINKEDIN_CLIENT_ID'),
    clientSecret: configService.get<string>('LINKEDIN_CLIENT_SECRET'),
    callbackURL: configService.get<string>('LINKEDIN_CALLBACK_URL'),
    scope: ['r_liteprofile', 'r_emailaddress'],
});
=======
import { ConfigService } from '@nestjs/config';
import { StrategyOption } from 'passport-linkedin-oauth2';

export const linkedInConfig = (
  configService: ConfigService,
): StrategyOption => ({
  clientID: configService.get<string>('social.linkedin.clientId'),
  clientSecret: configService.get<string>('social.linkedin.clientSecret'),
  callbackURL: configService.get<string>('social.linkedin.callbackUrl'),
  scope: ['openid', 'email', 'profile'],
});
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
