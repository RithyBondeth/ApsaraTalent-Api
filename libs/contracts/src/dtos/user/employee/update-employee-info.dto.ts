import { EmployeeResponseDTO } from '../../shared/user.dto';
import { EGender } from '@app/common/database/enums/gender.enum';
import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import { ENoticePeriod } from '@app/common/database/enums/notice-period.enum';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

class SkillDTO {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

class ExperienceDTO {
  @IsString()
  @IsOptional()
  id?: string;

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

class CareerScopeDTO {
  @IsString()
  @IsOptional()
  id?: string;

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
  id?: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsUrl()
  @IsOptional()
  url?: string;
}

class EducationDTO {
  @IsString()
  @IsOptional()
  id?: string;

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

export class UpdateEmployeeInfoDTO {
  @IsString()
  @IsOptional()
  firstname?: string;

  @IsString()
  @IsOptional()
  lastname?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dob?: Date;

  @IsString()
  @IsOptional()
  username?: string;

  @IsEnum(EGender)
  @IsOptional()
  gender?: EGender;

  @IsString()
  @IsOptional()
  job?: string;

  @IsString()
  @IsOptional()
  yearsOfExperience?: string;

  @IsString()
  @IsOptional()
  availability?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;
  @IsString() @IsOptional() phone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDTO)
  @IsOptional()
  educations?: EducationDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDTO)
  @IsOptional()
  skills?: SkillDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDTO)
  @IsOptional()
  experiences?: ExperienceDTO[];

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

  @IsEnum(EWorkMode)
  @IsOptional()
  workMode?: EWorkMode;

  @IsEnum(ENoticePeriod)
  @IsOptional()
  noticePeriod?: ENoticePeriod;

  @IsUrl()
  @IsOptional()
  portfolioUrl?: string;

  @IsUrl()
  @IsOptional()
  linkedinUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languages?: string[];

  @IsNumber()
  @IsPositive()
  @IsOptional()
  expectedSalaryMin?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  expectedSalaryMax?: number;
}

export class UpdateEmployeeInfoResponseDTO {
  message: string;
  employee: EmployeeResponseDTO;

  constructor(partial: Partial<UpdateEmployeeInfoResponseDTO>) {
    Object.assign(this, partial);
  }
}
