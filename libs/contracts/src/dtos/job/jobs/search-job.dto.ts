import { assignDtoData } from '../../../utils/assign-dto-data.util';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
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
  @ApiHideProperty()
  role: EUserRole;
  @Exclude()
  @ApiHideProperty()
  email: string | null;
  @Exclude()
  @ApiHideProperty()
  password: string | null;
  @Exclude()
  @ApiHideProperty()
  phone: string | null;
  @Exclude()
  @ApiHideProperty()
  otpCode: string | null;
  @Exclude()
  @ApiHideProperty()
  otpCodeExpires: Date | null;
  @Exclude()
  @ApiHideProperty()
  pushNotificationToken: string | null;
  @Exclude()
  @ApiHideProperty()
  profileCompleted: boolean;
  @Exclude()
  @ApiHideProperty()
  resetPasswordToken: string | null;
  @Exclude()
  @ApiHideProperty()
  resetPasswordExpires: Date | null;
  @Exclude()
  @ApiHideProperty()
  refreshToken: string | null;
  @Exclude()
  @ApiHideProperty()
  isEmailVerified: boolean;
  @Exclude()
  @ApiHideProperty()
  emailVerificationOtp: string | null;
  @Exclude()
  @ApiHideProperty()
  emailVerificationOtpExpires: Date | null;
  @Exclude()
  @ApiHideProperty()
  emailVerificationAttempts: number;
  @Exclude()
  @ApiHideProperty()
  isTwoFactorEnabled: boolean;
  @Exclude()
  @ApiHideProperty()
  twoFactorSecret: string | null;
  @Exclude()
  @ApiHideProperty()
  facebookId: string | null;
  @Exclude()
  @ApiHideProperty()
  googleId: string | null;
  @Exclude()
  @ApiHideProperty()
  linkedinId: string | null;
  @Exclude()
  @ApiHideProperty()
  githubId: string | null;
  @Exclude()
  @ApiHideProperty()
  createdAt: Date;

  constructor(partial: Partial<UserInJobResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class CompanyInJobResponseDTO {
  id: string;
  name: string;
  @Exclude()
  @ApiHideProperty()
  description: string;
  @Exclude()
  @ApiHideProperty()
  phone: string;
  avatar: string;
  @Exclude()
  @ApiHideProperty()
  cover: string;
  companySize: number;
  industry: string;
  location: string;
  @Exclude()
  @ApiHideProperty()
  foundedYear: number;
  @Exclude()
  @ApiHideProperty()
  createdAt: Date;
  @Type(() => UserInJobResponseDTO)
  user: UserInJobResponseDTO;

  constructor(partial: Partial<CompanyInJobResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class JobResponseDTO {
  id: string;
  title: string;
  description: string;
  type: string;
  @Exclude()
  @ApiHideProperty()
  experienceRequired: string;
  @Exclude()
  @ApiHideProperty()
  educationRequired: string;
  @Exclude()
  @ApiHideProperty()
  skillsRequired: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  workMode?: EWorkMode;
  location?: string;
  languagesRequired?: string[];
  openingsCount?: number;
  @Exclude()
  @ApiHideProperty()
  @Transform(({ value }) => (value ? value.toISOString() : null))
  expireDate: Date;
  @Exclude()
  @ApiHideProperty()
  @Transform(({ value }) => (value ? value.toISOString() : null))
  createdAt: Date;
  @Type(() => CompanyInJobResponseDTO)
  company: CompanyInJobResponseDTO;
  isHide: boolean;

  constructor(partial: Partial<JobResponseDTO>) {
    assignDtoData(this, partial);
  }

  @Expose()
  @ApiProperty({ type: String })
  get experience(): string {
    return this.experienceRequired;
  }

  @Expose()
  @ApiProperty({ type: String })
  get education(): string {
    return this.educationRequired;
  }

  @Expose()
  @ApiProperty({ type: [String] })
  get skills(): string[] {
    return this.skillsRequired.split(',').map((s) => s.trim());
  }

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  get deadlineDate(): string | null {
    return this.expireDate
      ? formatDateToDDMMYYYY(new Date(this.expireDate))
      : null;
  }

  @Expose()
  @ApiProperty({ type: String, nullable: true })
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
