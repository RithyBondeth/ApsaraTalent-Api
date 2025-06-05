import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, IsStrongPassword, ValidateNested } from "class-validator";

export class CompanyRegisterDTO {
    @IsBoolean()
    @IsNotEmpty()
    authEmail?: boolean;
    
    @IsEmail()
    @IsOptional()
    email: string;

    @IsStrongPassword()
    @IsOptional()
    password: string;

    @IsString()
    @IsOptional()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsOptional()
    phone: string;

    @IsOptional()
    avatar?: Express.Multer.File;

    @IsOptional()
    cover?: Express.Multer.File;

    @IsOptional()
    images?: Express.Multer.File[];

    @IsString()
    @IsNotEmpty()
    industry: string;

    @IsString()
    @IsOptional()
    location: string;

    @IsNumber()
    @Type(() => Number) 
    @IsNotEmpty()
    companySize: number;

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    foundedYear: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => JobDTO)
    @IsOptional()
    jobs?: JobDTO[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BenefitDTO)
    @IsOptional()
    benefits?: BenefitDTO[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ValueDTO)
    @IsOptional()
    values?: ValueDTO[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CareerScopeDTO)
    @IsOptional() 
    careerScopes?: CareerScopeDTO[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SocialDTO)
    @IsOptional()
    socials?: SocialDTO[];
}

class JobDTO {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    type: string;

    @IsString()
    @IsNotEmpty()
    experienceRequired: string;

    @IsString()
    @IsNotEmpty()
    educationRequired: string;

    @IsString()
    @IsNotEmpty()
    skillsRequired: string;

    @IsString()
    @IsNotEmpty()
    salary: string;

    @IsDate()
    @Type(() => Date)
    @IsNotEmpty()
    expireDate: Date;
}

class BenefitDTO {
    @IsString()
    @IsNotEmpty()
    label: string;
}

class ValueDTO {
    @IsString()
    @IsNotEmpty()
    label: string;
}

class CareerScopeDTO {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

class SocialDTO {
    @IsString()
    @IsOptional()
    platform?: string;

    @IsString()
    @IsOptional()
    url?: string;
}