import { assignDtoData } from '../../utils/assign-dto-data.util';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { EGender } from '@app/common/database/enums/gender.enum';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import { ENoticePeriod } from '@app/common/database/enums/notice-period.enum';
import { ECompanyType } from '@app/common/database/enums/company-type.enum';
import { Exclude, Expose, Type } from 'class-transformer';
import { formatDateToDDMMYYYY } from '@app/common/utils/date-formatter.util';

export class SkillResponseDTO {
  id?: string;
  name: string;
  description?: string;

  constructor(partial: Partial<SkillResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class ExperienceResponseDTO {
  id?: string;
  title: string;
  company?: string;
  description: string;
  @Type(() => Date)
  startDate: Date;
  @Type(() => Date)
  endDate: Date;

  constructor(partial: Partial<ExperienceResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class EducationResponseDTO {
  id?: string;
  school: string;
  degree: string;
  year: string;

  constructor(partial: Partial<EducationResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class SocialResponseDTO {
  id?: string;
  platform: string;
  url: string;

  constructor(partial: Partial<SocialResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class EmployeeResponseDTO {
  userId?: string;
  id: string;
  firstname: string;
  lastname: string;
  @Type(() => Date)
  dob?: Date;
  username: string;
  gender: EGender;
  avatar?: string;
  phone: string;
  email?: string;
  job: string;
  yearsOfExperience: string;
  availability: string;
  description: string;
  location: string;
  resume?: string;
  coverLetter?: string;
  workMode?: EWorkMode;
  noticePeriod?: ENoticePeriod;
  portfolioUrl?: string;
  linkedinUrl?: string;
  languages?: string[];
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  isHide: boolean;
  @Type(() => SkillResponseDTO)
  skills?: SkillResponseDTO[];
  @Type(() => ExperienceResponseDTO)
  experiences?: ExperienceResponseDTO[];
  @Type(() => EducationResponseDTO)
  educations?: EducationResponseDTO[];
  @Type(() => SocialResponseDTO)
  socials?: SocialResponseDTO[];
  @Type(() => CareerScopesResponseDTO)
  careerScopes?: CareerScopesResponseDTO[];
  @Type(() => Date)
  createdAt?: Date;
  @Type(() => Date)
  updatedAt?: Date;

  constructor(partial: Partial<EmployeeResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class ImageResponseDTO {
  id?: string;
  image: string;
  @Exclude()
  @ApiHideProperty()
  createdAt: Date;
  @Exclude()
  @ApiHideProperty()
  updatedAt: Date;

  constructor(partial: Partial<ImageResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class JobPositionResponseDTO {
  id: string;
  title: string;
  description: string;
  salary: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  workMode?: EWorkMode;
  location?: string;
  openingsCount?: number;
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
  @Exclude()
  @ApiHideProperty()
  expireDate: Date;
  @Exclude()
  @ApiHideProperty()
  createdAt: Date;

  constructor(partial: Partial<JobPositionResponseDTO>) {
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
    return this.expireDate ? formatDateToDDMMYYYY(this.expireDate) : null;
  }

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  get postedDate(): string | null {
    return this.createdAt ? formatDateToDDMMYYYY(this.createdAt) : null;
  }
}

export class ValuesAndBenefitsResponseDTO {
  id?: number;
  label: string;

  constructor(partial: Partial<ValuesAndBenefitsResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class CareerScopesResponseDTO {
  id?: string;
  name: string;
  description?: string;

  constructor(partial: Partial<CareerScopesResponseDTO>) {
    assignDtoData(this, partial);
  }
}

export class CompanyResponseDTO {
  id: string;
  name: string;
  industry: string;
  description: string;
  avatar?: string;
  cover?: string;
  companySize: number;
  foundedYear: number;
  location: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  companyType?: ECompanyType;
  @Type(() => ImageResponseDTO)
  images?: ImageResponseDTO[];
  @Type(() => JobPositionResponseDTO)
  openPositions?: JobPositionResponseDTO[];
  @Type(() => ValuesAndBenefitsResponseDTO)
  values?: ValuesAndBenefitsResponseDTO[];
  @Type(() => ValuesAndBenefitsResponseDTO)
  benefits?: ValuesAndBenefitsResponseDTO[];
  @Type(() => CareerScopesResponseDTO)
  careerScopes?: CareerScopesResponseDTO[];
  @Type(() => SocialResponseDTO)
  socials: SocialResponseDTO[];
  @Type(() => Date)
  createdAt: Date;

  constructor(partial: Partial<CompanyResponseDTO>) {
    assignDtoData(this, partial);
  }

  @Expose()
  @ApiProperty({ type: [String] })
  get availableTimes(): string[] {
    return [...(new Set(this.openPositions?.map((job) => job.type)) || [])];
  }
}

export class UserResponseDTO {
  id: string;
  role: EUserRole;
  email?: string;
  @Exclude()
  @ApiHideProperty()
  password?: string;
  phone?: string;
  @Exclude()
  @ApiHideProperty()
  otpCode?: string;
  @Exclude()
  @ApiHideProperty()
  otpCodeExpires?: Date;
  @Exclude()
  @ApiHideProperty()
  pushNotificationToken?: string;
  @Exclude()
  @ApiHideProperty()
  resetPasswordToken?: string;
  @Exclude()
  @ApiHideProperty()
  resetPasswordExpires?: Date;
  @Exclude()
  @ApiHideProperty()
  refreshToken?: string;
  isEmailVerified?: boolean;
  // Declared because it is in the SAFE_USER_FIELDS allowlist and therefore
  // genuinely part of the response. It reached clients anyway — the constructor
  // Object.assigns whatever it is given — but an undeclared field is a contract
  // nothing type-checks, and the web depends on this one for onboarding routing.
  profileCompleted?: boolean;
  @Exclude()
  @ApiHideProperty()
  emailVerificationToken?: string;
  isTwoFactorEnabled?: boolean;
  @Exclude()
  @ApiHideProperty()
  twoFactorSecret?: string;
  @Exclude()
  @ApiHideProperty()
  facebookId?: string;
  @Exclude()
  @ApiHideProperty()
  googleId?: string;
  @Exclude()
  @ApiHideProperty()
  linkedinId?: string;
  @Exclude()
  @ApiHideProperty()
  githubId?: string;
  @Type(() => EmployeeResponseDTO)
  employee?: EmployeeResponseDTO;
  @Type(() => CompanyResponseDTO)
  company?: CompanyResponseDTO;
  lastLoginMethod?: ELoginMethod;
  @Type(() => Date)
  lastLoginAt?: Date;
  @Type(() => Date)
  createdAt?: Date;
  @Type(() => Date)
  updatedAt?: Date;

  constructor(partial: Partial<UserResponseDTO>) {
    assignDtoData(this, partial);
    if (this.employee && !(this.employee instanceof EmployeeResponseDTO)) {
      this.employee = new EmployeeResponseDTO(this.employee);
    }
    if (this.company && !(this.company instanceof CompanyResponseDTO)) {
      this.company = new CompanyResponseDTO(this.company);
    }
  }
}
