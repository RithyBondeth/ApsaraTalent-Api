import { IsEmail, IsNotEmpty, IsStrongPassword } from "class-validator";

export class LoginDTO {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsStrongPassword()
    @IsNotEmpty()
    password: string;
}