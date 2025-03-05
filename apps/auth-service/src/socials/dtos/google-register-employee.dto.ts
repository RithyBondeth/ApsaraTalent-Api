import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPhoneNumber, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EGender } from '@app/common/database/enums/gender.enum';

export class RegisterGoogleEmployeeDTO {
    @IsEmail()
    @IsNotEmpty()
    email: string;  // Extracted from Google

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsEnum(EGender)
    @IsOptional()
    gender?: EGender;  // Extracted from Google

    @IsString()
    @IsOptional()
    job?: string;

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    yearsOfExperience?: number;

    @IsString()
    @IsOptional()
    availability?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsPhoneNumber(null)
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

class ExperienceDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNotEmpty()
    @Type(() => Date)
    startDate: Date;
   
    @IsNotEmpty()
    @Type(() => Date)
    endDate: Date;
}

class SocialDto {
    @IsString() 
    @IsOptional()
    platform?: string;

    @IsString()
    @IsOptional()
    url?: string;
}

class SkillDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}

class CareerScopeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}