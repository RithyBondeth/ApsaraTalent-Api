import { EGender } from "@app/common/database/enums/gender.enum";
import { EUserRole } from "@app/common/database/enums/user-role.enum";
import { Type } from "class-transformer";
import { IsArray, IsDate, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsStrongPassword, IsUrl, ValidateNested  } from "class-validator";

export class EmployeeRegisterDTO {
    @IsEmail()
    @IsNotEmpty()
    email: string;
    
    @IsStrongPassword()
    @IsNotEmpty()
    password: string;

    // Employee 
    @IsString()
    @IsNotEmpty()
    firstname: string;

    @IsString()
    @IsNotEmpty()
    lastname: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsEnum(EGender)
    @IsOptional()
    gender?: EGender;

    @IsOptional()
    avatar?: Express.Multer.File;

    @IsString()
    @IsNotEmpty()
    job: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    yearsOfExperience?: number;
    
    @IsString()
    @IsOptional()
    availability?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsNotEmpty()
    location: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SkillDto)
    @IsOptional()
    skills?: SkillDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExperienceDto) 
    @IsOptional()
    experiences?: ExperienceDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CareerScopeDto)
    @IsOptional()
    careerScopes?: CareerScopeDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SocialDto)
    @IsOptional()
    socials?: SocialDto[];
}

class SkillDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

class ExperienceDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    startDate: Date;
   
    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    endDate: Date;
}

class CareerScopeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

class SocialDto {
    @IsString() 
    @IsOptional()
    platform?: string;

    @IsUrl()
    @IsOptional()
    url?: string;
}

class EducationDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description: string;
    
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    endDate: Date;
}