import { User } from "@app/common/database/entities/user.entiry";

export class LoginResponseDTO {
    message: string;
    accessToken: string;
    refreshToken: string;
    user: User;

    constructor(partial: Partial<LoginResponseDTO>) {
        return Object.assign(this, partial);
    }
}  