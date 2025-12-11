import { EGender } from '@app/common/database/enums/gender.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsStrongPassword,
  ValidateNested,
} from 'class-validator';
import { formatDateToDDMMYYYY } from 'utils/functions/date-formatter';

export class EmployeeResponseDTO {
  userId: string;

  @IsString()
  id: string;

  @IsString()
  firstname: string;

  @IsString()
  lastname: string;

  @IsString()
  username: string;

  @IsEnum(EGender)
  gender: EGender;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  phone: string;

  @IsString()
  email: string;

  @IsString()
  job: string;

  @IsNumber()
  @IsPositive()
  yearsOfExperience: number;

  @IsString()
  availability: string;

  @IsString()
  description: string;

  @IsString()
  location: string;

  @IsString()
  @IsOptional()
  resume?: string;

  @IsString()
  @IsOptional()
  coverLetter?: string;

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
  @Type(() => EducationDTO)
  @IsOptional()
  educations?: EducationDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialDTO)
  @IsOptional()
  socials?: SocialDTO[];

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  constructor(partial: Partial<EmployeeResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class SkillDTO {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  constructor(partial: Partial<SkillDTO>) {
    return Object.assign(this, partial);
  }
}

export class ExperienceDTO {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  constructor(partial: Partial<ExperienceDTO>) {
    return Object.assign(this, partial);
  }
}

export class EducationDTO {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  school: string;

  @IsString()
  degree: string;

  @IsString()
  year: string;

  constructor(partial: Partial<EducationDTO>) {
    return Object.assign(this, partial);
  }
}

export class SocialDTO {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  platform: string;

  @IsString()
  url: string;

  constructor(partial: Partial<SocialDTO>) {
    return Object.assign(this, partial);
  }
}

export class CompanyResponseDTO {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  industry: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  cover?: string;

  @IsNumber()
  @IsPositive()
  companySize: number;

  @IsNumber()
  @IsPositive()
  foundedYear: number;

  @IsString()
  location: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsArray()
  @Type(() => ImageDTO)
  @ValidateNested({ each: true })
  @IsOptional()
  images?: ImageDTO[];

  @IsArray()
  @Type(() => JobPositionDTO)
  @ValidateNested({ each: true })
  @IsOptional()
  openPositions?: JobPositionDTO[];

  @IsArray()
  @Type(() => ValuesAndBenefitsDTO)
  @ValidateNested({ each: true })
  @IsOptional()
  values?: ValuesAndBenefitsDTO[];

  @IsArray()
  @Type(() => ValuesAndBenefitsDTO)
  @ValidateNested({ each: true })
  @IsOptional()
  benefits?: ValuesAndBenefitsDTO[];

  @Expose()
  get availableTimes(): string[] {
    return [...(new Set(this.openPositions?.map((job) => job.type)) || [])];
  }

  @IsArray()
  @Type(() => CareerScopesDTO)
  @ValidateNested({ each: true })
  @IsOptional()
  careerScopes?: CareerScopesDTO[];

  @IsArray()
  @Type(() => SocialDTO)
  @ValidateNested({ each: true })
  @IsOptional()
  socials: SocialDTO[];

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  constructor(partial: Partial<CompanyResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class ImageDTO {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  image: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  constructor(partial: Partial<ImageDTO>) {
    return Object.assign(this, partial);
  }
}

export class JobPositionDTO {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  salary: string;

  @IsString()
  type: string;

  @Exclude()
  experienceRequired: string;

  @Expose()
  get experience(): string {
    return this.experienceRequired;
  }

  @Exclude()
  educationRequired: string;

  @Expose()
  get education(): string {
    return this.educationRequired;
  }

  @Exclude()
  skillsRequired: string;

  @Expose()
  get skills(): string[] {
    return this.skillsRequired.split(',').map((skill) => skill.trim());
  }

  @Exclude()
  expireDate: Date;

  @Expose()
  get deadlineDate(): string | null {
    return this.expireDate ? formatDateToDDMMYYYY(this.expireDate) : null;
  }

  @Exclude()
  createdAt: Date;

  @Expose()
  get postedDate(): string | null {
    return this.createdAt ? formatDateToDDMMYYYY(this.createdAt) : null;
  }

  constructor(partial: Partial<JobPositionDTO>) {
    return Object.assign(this, partial);
  }
}

export class ValuesAndBenefitsDTO {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  id?: number;

  @IsString()
  label: string;

  constructor(partial: Partial<ValuesAndBenefitsDTO>) {
    return Object.assign(this, partial);
  }
}

export class CareerScopesDTO {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  constructor(partial: Partial<CareerScopesDTO>) {
    return Object.assign(this, partial);
  }
}

export class UserResponseDTO {
  @IsString()
  id: string;

  @IsEnum(EUserRole)
  role: EUserRole;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  otpCode?: string;

  @IsDate()
  @IsOptional()
  otpCodeExpires?: Date;

  @IsString()
  @IsOptional()
  pushNotificationToken?: string;

  @IsString()
  @IsOptional()
  resetPasswordToken?: string;

  @IsDate()
  @IsOptional()
  resetPasswordExpires?: Date;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsBoolean()
  @IsOptional()
  isEmailVerified?: boolean;

  @IsString()
  @IsOptional()
  emailVerificationToken?: string;

  @IsBoolean()
  @IsOptional()
  isTwoFactorEnabled?: boolean;

  @IsString()
  @IsOptional()
  twoFactorSecret?: string;

  @IsString()
  @IsOptional()
  facebookId?: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  linkedinId?: string;

  @IsString()
  @IsOptional()
  githubId?: string;

  @ValidateNested()
  @Type(() => EmployeeResponseDTO)
  @IsOptional()
  employee?: EmployeeResponseDTO;

  @ValidateNested()
  @Type(() => CompanyResponseDTO)
  @IsOptional()
  company?: CompanyResponseDTO;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  constructor(partial: Partial<UserResponseDTO>) {
    return Object.assign(this, partial);
  }
}
