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
