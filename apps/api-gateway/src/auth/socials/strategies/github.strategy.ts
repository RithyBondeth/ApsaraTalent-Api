import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { githubAuthConfig } from '../config/github.config';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly configService: ConfigService) {
    super(githubAuthConfig(configService));
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, username, photos, emails } = profile;

    return {
      id,
      username,
      email: emails?.[0]?.value,
      picture: photos?.[0]?.value,
      provider: 'github',
    };
  }
}
