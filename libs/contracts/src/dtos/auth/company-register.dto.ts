import { CAREER_SCOPE } from '../../constants/domain/career-scope.constant';
import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import { COMPANY_TYPE_MAX_LENGTH } from '@app/common/database/enums/company-type.enum';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
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

export class CompanyRegisterDTO {
  @IsBoolean()
  @IsNotEmpty()
  authEmail?: boolean;

  @IsEmail()
  @IsOptional()
  email: string;

  @IsStrongPassword()
  @IsOptional()
  password: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsOptional()
  avatar?: Express.Multer.File;

  @IsOptional()
  cover?: Express.Multer.File;

  @IsOptional()
  images?: Express.Multer.File[];

  @IsString()
  @IsNotEmpty()
  industry: string;

  @IsString()
  @IsOptional()
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
  @Type(() => JobDTO)
  @IsOptional()
  jobs?: JobDTO[];

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
  @ArrayMaxSize(CAREER_SCOPE.MAX_PER_PROFILE)
  @ValidateNested({ each: true })
  @Type(() => CareerScopeDTO)
  @IsOptional()
  careerScopes?: CareerScopeDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialDTO)
  @IsOptional()
  socials?: SocialDTO[];

  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  // Free text: `ECompanyType` is the suggested set, not the allowed one.
  @IsString()
  @MaxLength(COMPANY_TYPE_MAX_LENGTH)
  @IsOptional()
  companyType?: string;
}

class JobDTO {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  experienceRequired: string;

  @IsString()
  @IsNotEmpty()
  educationRequired: string;

  @IsString()
  @IsNotEmpty()
  skillsRequired: string;

  @IsString()
  @IsOptional()
  salary?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  salaryMin?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  salaryMax?: number;

  @IsString()
  @IsOptional()
  salaryCurrency?: string;

  @IsEnum(EWorkMode)
  @IsOptional()
  workMode?: EWorkMode;

  @IsString()
  @IsOptional()
  location?: string;

  // Same shape as `EmployeeRegisterDTO.languages`, so the two sides compare
  // directly when matching a candidate to a role.
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  languagesRequired?: string[];

  @IsInt()
  @IsPositive()
  @IsOptional()
  openingsCount?: number;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  expireDate: Date;
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

class CareerScopeDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(CAREER_SCOPE.NAME_MAX_LENGTH)
  name: string;

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

export class CompanyRegisterResponseDTO extends LoginResponseDTO {
  constructor(partial: Partial<CompanyRegisterResponseDTO>) {
    super(partial);
  }
}
