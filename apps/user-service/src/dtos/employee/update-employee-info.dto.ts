import { EGender } from '@app/common/database/enums/gender.enum';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class UpdateEmployeeInfoDTO {
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
  job?: string;

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
  location?: string;

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
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

class ExperienceDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

class CareerScopeDto {
  @IsString()
  @IsOptional()
  name?: string;

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
