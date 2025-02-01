import { EUserRole } from "@app/common/enums/user-role.enum";
import { IsEmail, IsEnum, IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class RegisterDTO {
    @IsString()
    @IsNotEmpty()
    firstname: string;
    
    @IsString()
    @IsNotEmpty()
    lastname: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsStrongPassword()
    @IsNotEmpty()
    password: string;

    @IsEnum(EUserRole)
    @IsNotEmpty()
    role: EUserRole;

    @IsString({ each: true })
    @IsNotEmpty()
    careers: string[];
}  