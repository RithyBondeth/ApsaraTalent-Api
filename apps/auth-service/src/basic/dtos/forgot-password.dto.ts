import { IsEmail, IsNotEmpty } from "class-validator";

export class ForgotPasswordDTO {
    @IsEmail()
    @IsNotEmpty()
    identifier: string;
}