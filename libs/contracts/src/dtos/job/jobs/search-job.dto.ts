import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import { formatDateToDDMMYYYY } from '@app/common/utils/date-formatter.util';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class SearchJobDTO {
  @IsOptional()
  @IsString()
  @MinLength(2)
  keyword?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  careerScopes?: string[];

  @IsOptional()
  @IsNumber()
  companySizeMin?: number;

  @IsOptional()
  @IsNumber()
  companySizeMax?: number;

  @IsOptional()
  @IsDateString()
  postedDateFrom?: string;

  @IsOptional()
  @IsDateString()
  postedDateTo?: string;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  jobType?: string[];

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  educationRequired?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  @IsOptional()
  @IsEnum(EWorkMode)
  workMode?: EWorkMode;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  excludeCompanyIds?: string[];

  @IsOptional()
  @IsUUID()
  requesterId?: string;
}

export class UserInJobResponseDTO {
  id: string;
  @Exclude()
  role: EUserRole;
  @Exclude()
  email: string | null;
  @Exclude()
  password: string | null;
  @Exclude()
  phone: string | null;
  @Exclude()
  otpCode: string | null;
  @Exclude()
  otpCodeExpires: Date | null;
  @Exclude()
  pushNotificationToken: string | null;
  @Exclude()
  profileCompleted: boolean;
  @Exclude()
  resetPasswordToken: string | null;
  @Exclude()
  resetPasswordExpires: Date | null;
  @Exclude()
  refreshToken: string | null;
  @Exclude()
  isEmailVerified: boolean;
  @Exclude()
  emailVerificationToken: string | null;
  @Exclude()
  isTwoFactorEnabled: boolean;
  @Exclude()
  twoFactorSecret: string | null;
  @Exclude()
  facebookId: string | null;
  @Exclude()
  googleId: string | null;
  @Exclude()
  linkedinId: string | null;
  @Exclude()
  githubId: string | null;
  @Exclude()
  createdAt: Date;

  constructor(partial: Partial<UserInJobResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class CompanyInJobResponseDTO {
  id: string;
  name: string;
  @Exclude()
  description: string;
  @Exclude()
  phone: string;
  avatar: string;
  @Exclude()
  cover: string;
  companySize: number;
  industry: string;
  location: string;
  @Exclude()
  foundedYear: number;
  @Exclude()
  createdAt: Date;
  @Type(() => UserInJobResponseDTO)
  user: UserInJobResponseDTO;

  constructor(partial: Partial<CompanyInJobResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class JobResponseDTO {
  id: string;
  title: string;
  description: string;
  type: string;
  @Exclude()
  experienceRequired: string;
  @Exclude()
  educationRequired: string;
  @Exclude()
  skillsRequired: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  workMode?: EWorkMode;
  location?: string;
  openingsCount?: number;
  @Exclude()
  @Transform(({ value }) => (value ? value.toISOString() : null))
  expireDate: Date;
  @Exclude()
  @Transform(({ value }) => (value ? value.toISOString() : null))
  createdAt: Date;
  @Type(() => CompanyInJobResponseDTO)
  company: CompanyInJobResponseDTO;
  isHide: boolean;

  constructor(partial: Partial<JobResponseDTO>) {
    Object.assign(this, partial);
  }

  @Expose()
  get experience(): string {
    return this.experienceRequired;
  }

  @Expose()
  get education(): string {
    return this.educationRequired;
  }

  @Expose()
  get skills(): string[] {
    return this.skillsRequired.split(',').map((s) => s.trim());
  }

  @Expose()
  get deadlineDate(): string | null {
    return this.expireDate
      ? formatDateToDDMMYYYY(new Date(this.expireDate))
      : null;
  }

  @Expose()
  get postedDate(): string | null {
    return this.createdAt
      ? formatDateToDDMMYYYY(new Date(this.createdAt))
      : null;
  }
}

export class SearchJobResponseDTO extends JobResponseDTO {
  constructor(partial: Partial<SearchJobResponseDTO>) {
    super(partial);
  }
}

export class SearchJobResult {
  data: SearchJobResponseDTO[];
  total: number;
  page: number;
  pageSize: number;
  isUsingFallback: boolean;
}
