import { Strategy } from 'passport-linkedin-oauth2';
import fetch from 'node-fetch';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { linkedInConfig } from '../config/linkedin.config';
import * as crypto from 'node:crypto';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(private readonly configService: ConfigService) {
    super(linkedInConfig(configService));
  }

  authorizationParams() {
    return { state: crypto.randomUUID() };
  }

  userProfile(accessToken: string, done: Function) {
    fetch(this.configService.get<string>('social.linkedin.profileUrl'), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) =>
        done(null, {
          id: d.sub,
          emails: [{ value: d.email }],
          name: { givenName: d.given_name, familyName: d.family_name },
          photos: [{ value: d.picture }],
          provider: 'linkedin',
        }),
      )
      .catch((err) => done(err));
  }

  async validate(_: string, __: string, profile: any) {
    console.log('LinkedIn validate():', profile);
    return profile;
  }
}
