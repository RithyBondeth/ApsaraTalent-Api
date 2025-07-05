// import { ConfigService } from '@nestjs/config';
// import { PassportStrategy } from '@nestjs/passport';
// import { Profile, Strategy } from 'passport-linkedin-oauth2';
// import { linkedInConfig } from '../config/linkedin.config';
// import { Injectable } from '@nestjs/common';
// import { VerifyCallback } from 'passport-oauth2';
// import * as crypto from 'node:crypto'; 
// @Injectable()
// export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
//   constructor(private readonly configService: ConfigService) {
//     super(linkedInConfig(configService));
//   }
  
//   authorizationParams(options: any) {
//     return { state: crypto.randomUUID() };   // generate your own
//   }
//   async validate(
//     accessToken: string,
//     _refresh: string,
//     profile: Profile,
//     done: VerifyCallback,
//   ) {
//     const user = {
//       id:         profile.id,
//       email:      profile.emails?.[0]?.value ?? null,
//       firstName:  profile.name?.givenName      ?? (profile as any).localizedFirstName,
//       lastName:   profile.name?.familyName     ?? (profile as any).localizedLastName,
//       picture:    profile.photos?.[0]?.value   ?? null,
//       provider:   'linkedin',
//     };
//     return done(null, user);
//   }
// }

import { Strategy } from 'passport-linkedin-oauth2';
import fetch from 'node-fetch';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { linkedInConfig } from '../config/linkedin.config';
import * as crypto from 'node:crypto'; 

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(private readonly configService : ConfigService) {
    super(linkedInConfig(configService));
  }
  
  authorizationParams() { return { state: crypto.randomUUID() }; }

  userProfile(accessToken: string, done: Function) {
    fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d =>
        done(null, {
          id:        d.sub,
          emails:    [{ value: d.email }],
          name:      { givenName: d.given_name, familyName: d.family_name },
          photos:    [{ value: d.picture }],
          provider:  'linkedin',
        }),
      )
      .catch(err => done(err));
  }

  async validate(_: string, __: string, profile: any) {
    console.log('LinkedIn validate():', profile); 
    return profile;   
  }
}