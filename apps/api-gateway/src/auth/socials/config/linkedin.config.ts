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
