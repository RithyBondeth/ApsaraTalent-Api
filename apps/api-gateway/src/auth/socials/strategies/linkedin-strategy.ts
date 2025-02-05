import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-linkedin-oauth2";
import { linkedInConfig } from "../config/linkedin.config";
import { Injectable } from "@nestjs/common";

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
    constructor(private readonly configService: ConfigService) {
        super(linkedInConfig(configService))
    }
    
    async validate(accessToken: string, refreshToken: string, profile: Profile): Promise<any> {
        return {
            id: profile.id,
            email: profile.emails[0].value,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            picture: profile.photos[0].value
        }
    }
}