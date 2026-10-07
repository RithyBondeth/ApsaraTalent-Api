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
  MaxLength,
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
  @Type(() => RegisterEmployeeEducationDTO)
  @IsOptional()
  educations?: RegisterEmployeeEducationDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterEmployeeSkillDTO)
  @IsOptional()
  skills?: RegisterEmployeeSkillDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterEmployeeExperienceDTO)
  @IsOptional()
  experiences?: RegisterEmployeeExperienceDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterEmployeeCareerScopeDTO)
  @IsOptional()
  careerScopes?: RegisterEmployeeCareerScopeDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterEmployeeSocialDTO)
  @IsOptional()
  socials?: RegisterEmployeeSocialDTO[];

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

class RegisterEmployeeSkillDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

class RegisterEmployeeExperienceDTO {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  company?: string;

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

class RegisterEmployeeCareerScopeDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

class RegisterEmployeeSocialDTO {
  @IsString()
  @IsOptional()
  platform?: string;

  @IsUrl()
  @IsOptional()
  url?: string;
}

class RegisterEmployeeEducationDTO {
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
