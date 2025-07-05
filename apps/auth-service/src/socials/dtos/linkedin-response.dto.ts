export class LinkedInLoginResponse {
    message: string;
    newUser: boolean;
    accessToken?: string | null;
    refreshToken?: string | null;
    provider?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
}