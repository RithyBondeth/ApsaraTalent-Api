import { IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";

export class LoginOtpDTO {
    @IsString()
    @IsNotEmpty()
    phone: string;  
}