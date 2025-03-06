import { IsArray, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterGoogleCompanyDTO {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsOptional()
    avatar?: string;  // Now stores Google profile image URL

    @IsString()
    @IsOptional()
    cover?: string;  // Now stores Google cover image URL

    @IsString()
    @IsNotEmpty()
    industry: string;

    @IsString()
    @IsNotEmpty()
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

class SocialDTO {
    @IsString()
    @IsOptional()
    platform?: string;

    @IsString()
    @IsOptional()
    url?: string;
}

class CareerScopeDTO {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;
}