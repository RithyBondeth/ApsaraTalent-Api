import { IsNotEmpty, IsString } from "class-validator";

export class LoginOtpDTO {
    @IsString()
    @IsNotEmpty()
    phone: string; 
}

