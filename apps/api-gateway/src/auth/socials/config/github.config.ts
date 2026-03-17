import { ConfigService } from '@nestjs/config';
import { StrategyOptions } from 'passport-github2';

export const githubAuthConfig = (
  configService: ConfigService,
): StrategyOptions => ({
  clientID: configService.get<string>('social.github.clientId'),
  clientSecret: configService.get<string>('social.github.clientSecret'),
  callbackURL: configService.get<string>('social.github.callbackUrl'),
  scope: ['user:email'],
});
