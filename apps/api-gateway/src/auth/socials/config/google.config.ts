<<<<<<< HEAD
import { ConfigService } from "@nestjs/config";
import { StrategyOptions } from "passport-google-oauth20";

export const googleAuthConfig = (configService: ConfigService): StrategyOptions  => ({
    clientID: configService.get<string>('GOOGLE_CLIENT_ID'), 
    clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
    callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
    scope: ['openid', 'email', 'profile']
});
=======
import { ConfigService } from '@nestjs/config';
import { StrategyOptions } from 'passport-google-oauth20';

export const googleAuthConfig = (
  configService: ConfigService,
): StrategyOptions => ({
  clientID: configService.get<string>('social.google.clientId'),
  clientSecret: configService.get<string>('social.google.clientSecret'),
  callbackURL: configService.get<string>('social.google.callbackUrl'),
  scope: ['openid', 'email', 'profile'],
});
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
