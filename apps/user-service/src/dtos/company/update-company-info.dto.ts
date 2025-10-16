import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from "class-validator";

export class UpdateCompanyInfoDTO {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsOptional()
    avatar?: Express.Multer.File;

    @IsOptional()
    cover?: Express.Multer.File;

    @IsString()
    @IsOptional()
    industry?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsNumber()
    @Type(() => Number) 
    @IsOptional()
    companySize?: number;

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    foundedYear?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => JobDTO)
    @IsOptional()
    jobs?: JobDTO[];

    @IsArray()
    @IsOptional()
    benefitIdsToDelete?: number[];

    @IsArray()
    @IsOptional()
    valueIdsToDelete?: number[];

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
    @IsOptional()
    id?: string;

    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    type?: string;

    @IsString()
    @IsOptional()
    experienceRequired?: string;

    @IsString()
    @IsOptional()
    educationRequired?: string;

    @IsString()
    @IsOptional()
    skillsRequired?: string;
}

class BenefitDTO {
    @IsNumber()
    @IsPositive()
    @IsOptional()
    id?: number;

    @IsString()
    @IsOptional()
    label?: string;
}

class ValueDTO {
    @IsNumber()
    @IsPositive()
    @IsOptional()
    id?: number;

    @IsString()
    @IsOptional()
    label?: string;
}

class CareerScopeDTO {
    @IsString()
    @IsOptional()
    name?: string;

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