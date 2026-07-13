import { EGender } from '@app/common/database/enums/gender.enum';
import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import { ENoticePeriod } from '@app/common/database/enums/notice-period.enum';
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
  IsPositive,
  IsString,
  IsStrongPassword,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { LoginResponseDTO } from './login.dto';

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
  job: string;

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
  location: string;

  @IsString()
  @IsOptional()
  phone?: string;

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

class SkillDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

class ExperienceDTO {
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

  @IsUrl()
  @IsOptional()
  url?: string;
}

class EducationDTO {
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

export class EmployeeRegisterResponseDTO extends LoginResponseDTO {
  constructor(partial: Partial<EmployeeRegisterResponseDTO>) {
    super(partial);
  }
}
