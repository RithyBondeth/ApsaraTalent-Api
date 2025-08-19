import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience: ExperienceDto[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsString()
  @IsOptional()
  education?: string;

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