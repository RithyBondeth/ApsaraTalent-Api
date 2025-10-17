import { ConfigService } from '@nestjs/config';
import { StrategyOptions } from 'passport-github2';

export const githubAuthConfig = (
  configService: ConfigService,
): StrategyOptions => ({
  clientID: configService.get<string>('GITHUB_CLIENT_ID'),
  clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
  callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
  scope: ['user:email'],
});
