import { ConfigService } from '@nestjs/config';
import { StrategyOptions } from 'passport-google-oauth20';

export const googleAuthConfig = (
  configService: ConfigService,
): StrategyOptions => ({
  clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
  clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
  callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
  scope: ['openid', 'email', 'profile'],
});
