import { CompanyResponseDTO } from '../../shared/user.dto';
import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import { ECompanyType } from '@app/common/database/enums/company-type.enum';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

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

  @IsInt()
  @IsPositive()
  @IsOptional()
  openingsCount?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expireDate?: Date | null;
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

  @IsString()
  @IsOptional()
  url?: string;
}

export class UpdateCompanyInfoDTO {
  @IsEmail()
  @IsOptional()
  email?: string;

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

  @IsString()
  @IsOptional()
  phone?: string;

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
  @IsString({ each: true })
  @IsOptional()
  careerScopeIdsToDelete?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  socialIdsToDelete?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  jobIdsToDelete?: string[];

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

  @IsUrl()
  @IsOptional()
  websiteUrl?: string | null;

  @IsEnum(ECompanyType)
  @IsOptional()
  companyType?: ECompanyType | null;
}

export class UpdateCompanyInfoResponseDTO {
  message: string;
  company: CompanyResponseDTO;

  constructor(partial: Partial<UpdateCompanyInfoResponseDTO>) {
    Object.assign(this, partial);
  }
}
