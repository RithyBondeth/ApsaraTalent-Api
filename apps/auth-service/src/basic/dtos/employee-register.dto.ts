import { EGender } from '@app/common/database/enums/gender.enum';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class EmployeeRegisterDTO {
  @IsBoolean()
  @IsNotEmpty()
  authEmail?: boolean;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsStrongPassword()
  @IsOptional()
  password: string;

  // Employee
  @IsString()
  @IsOptional()
  firstname?: string;

  @IsString()
  @IsOptional()
  lastname?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(EGender)
  @IsOptional()
  gender?: EGender;

  @IsString()
  @IsOptional()
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
  @IsOptional()
  location: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  @IsOptional()
  educations?: EducationDto[];

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
  school?: string;

  @IsString()
  @IsOptional()
  degree: string;

  @IsString()
  @IsOptional()
  year: string;
}
