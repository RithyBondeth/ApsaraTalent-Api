import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PersonalInfoDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  job?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsObject()
  @IsOptional()
  socials?: { [platform: string]: string };
}

export class ExperienceDto {
  @IsString()
  company: string;

  @IsString()
  position: string;

  @IsString()
  startDate: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  achievements: string[];
}

export class BuildResumeDTO {
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo: PersonalInfoDto;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  yearsOfExperience?: string;

  @IsString()
  @IsOptional()
  availability?: string;

  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience: ExperienceDto[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsString()
  @IsOptional()
  education?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  careerScopes?: string[];

  @IsString()
  @IsIn([
    'modern',
    'classic',
    'creative',
    'minimalist',
    'timeline',
    'bold',
    'compact',
    'elegant',
    'colorful',
    'professional',
    'corporate',
    'dark',
  ])
  template:
    | 'modern'
    | 'classic'
    | 'creative'
    | 'minimalist'
    | 'timeline'
    | 'bold'
    | 'compact'
    | 'elegant'
    | 'colorful'
    | 'professional'
    | 'corporate'
    | 'dark';
}
