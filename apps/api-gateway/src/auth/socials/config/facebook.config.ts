import { ConfigService } from '@nestjs/config';
import { StrategyOptions } from 'passport-facebook';

export const facebookAuthConfig = (
  configService: ConfigService,
): StrategyOptions => ({
  clientID: configService.get<string>('social.facebook.clientId'),
  clientSecret: configService.get<string>('social.facebook.clientSecret'),
  callbackURL: configService.get<string>('social.facebook.callbackUrl'),
  profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
  scope: ['email'],
});
