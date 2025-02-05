import { IsNotEmpty, IsOptional, IsString, IsStrongPassword } from "class-validator";

export class ResetPasswordDTO {
    @IsStrongPassword()
    @IsNotEmpty()
    newPassword: string;

    @IsStrongPassword()
    @IsNotEmpty()
    confirmPassword: string;

    @IsString()
    @IsOptional()
    token?: string;
}