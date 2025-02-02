import { RegisterReponseDTO } from "./register-response.dto";

export class LoginResponseDTO {
    message: string;
    accessToken: string;
    refreshToken: string;
    user: RegisterReponseDTO;

    constructor(partial: Partial<LoginResponseDTO>) {
        return Object.assign(this, partial);
    }
}  