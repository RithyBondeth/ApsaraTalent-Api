import { EUserRole } from "@app/common/enums/user-role.enum";
import { Type } from "class-transformer";
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsStrongPassword, ValidateNested } from "class-validator";

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

    @IsString()
    @IsNotEmpty()
    careerScopes: string;

    @IsOptional()
    profile?: Express.Multer.File;
}  