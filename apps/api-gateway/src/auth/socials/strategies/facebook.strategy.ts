import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-facebook";
import { facebookAuthConfig } from "../config/facebook.config";

export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(private readonly configService: ConfigService) {
        super(facebookAuthConfig(configService));
    }

    async validate(accessToken: string, refreshToken: string, profile: Profile) {
        return {
          id: profile.id,
          email: profile.emails?.[0]?.value ?? null,
          firstname: profile.name?.givenName ?? null,
          lastname: profile.name?.familyName ?? null,
          picture: profile.photos?.[0]?.value ?? null,
          provider: 'facebook',
        };
    }
}