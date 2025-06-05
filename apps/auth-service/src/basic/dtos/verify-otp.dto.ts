import { IsNotEmpty, IsString } from "class-validator";

export class VerifyOtpDTO {
    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    otp: string;    
}