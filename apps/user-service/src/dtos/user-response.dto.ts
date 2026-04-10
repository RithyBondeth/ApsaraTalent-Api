import { EGender } from '@app/common/database/enums/gender.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { Exclude, Expose, Type } from 'class-transformer';
import { formatDateToDDMMYYYY } from '@app/utils/functions/date-formatter';

export class EmployeeResponseDTO {
  userId: string;

  id: string;

  firstname: string;

  lastname: string;

  @Type(() => Date)
  dob?: Date;

  username: string;

  gender: EGender;

  avatar?: string;

  phone: string;

  email: string;

  job: string;

  yearsOfExperience: string;

  availability: string;

  description: string;

  location: string;

  resume?: string;

  coverLetter?: string;

  @Type(() => SkillResponseDTO)
  skills?: SkillResponseDTO[];

  @Type(() => ExperienceResponseDTO)
  experiences?: ExperienceResponseDTO[];

  @Type(() => EducationResponseDTO)
  educations?: EducationResponseDTO[];

  @Type(() => SocialResponseDTO)
  socials?: SocialResponseDTO[];

  @Type(() => Date)
  createdAt: Date;

  constructor(partial: Partial<EmployeeResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class SkillResponseDTO {
  id?: string;

  name: string;

  description?: string;

  constructor(partial: Partial<SkillResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class ExperienceResponseDTO {
  id?: string;

  title: string;

  description: string;

  @Type(() => Date)
  startDate: Date;

  @Type(() => Date)
  endDate: Date;

  constructor(partial: Partial<ExperienceResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class EducationResponseDTO {
  id?: string;

  school: string;

  degree: string;

  year: string;

  constructor(partial: Partial<EducationResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class SocialResponseDTO {
  id?: string;

  platform: string;

  url: string;

  constructor(partial: Partial<SocialResponseDTO>) {
    return Object.assign(this, partial);
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

  @Type(() => ImageResponseDTO)
  images?: ImageResponseDTO[];

  @Type(() => JobPositionResponseDTO)
  openPositions?: JobPositionResponseDTO[];

  @Type(() => ValuesAndBenefitsResponseDTO)
  values?: ValuesAndBenefitsResponseDTO[];

  @Type(() => ValuesAndBenefitsResponseDTO)
  benefits?: ValuesAndBenefitsResponseDTO[];

  @Expose()
  get availableTimes(): string[] {
    return [...(new Set(this.openPositions?.map((job) => job.type)) || [])];
  }

  @Type(() => CareerScopesResponseDTO)
  careerScopes?: CareerScopesResponseDTO[];

  @Type(() => SocialResponseDTO)
  socials: SocialResponseDTO[];

  @Type(() => Date)
  createdAt: Date;

  constructor(partial: Partial<CompanyResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class ImageResponseDTO {
  id?: string;

  image: string;

  @Exclude()
  createdAt: Date;

  @Exclude()
  updatedAt: Date;

  constructor(partial: Partial<ImageResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class JobPositionResponseDTO {
  id: string;

  title: string;

  description: string;

  salary: string;

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

  constructor(partial: Partial<JobPositionResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class ValuesAndBenefitsResponseDTO {
  id?: number;

  label: string;

  constructor(partial: Partial<ValuesAndBenefitsResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class CareerScopesResponseDTO {
  id?: string;

  name: string;

  description?: string;

  constructor(partial: Partial<CareerScopesResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class UserResponseDTO {
  id: string;

  role: EUserRole;

  email: string;

  password: string;

  phone?: string;

  otpCode?: string;

  otpCodeExpires?: Date;

  pushNotificationToken?: string;

  resetPasswordToken?: string;

  resetPasswordExpires?: Date;

  refreshToken?: string;

  isEmailVerified?: boolean;

  emailVerificationToken?: string;

  isTwoFactorEnabled?: boolean;

  twoFactorSecret?: string;

  facebookId?: string;

  googleId?: string;

  linkedinId?: string;

  githubId?: string;

  @Type(() => EmployeeResponseDTO)
  employee?: EmployeeResponseDTO;

  @Type(() => CompanyResponseDTO)
  company?: CompanyResponseDTO;

  @Type(() => Date)
  createdAt: Date;

  constructor(partial: Partial<UserResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class CountAllUsersResponseDTO {
  totalUsers?: number;

  totalEmployees?: number;

  totalCompanies?: number;

  constructor(partial: Partial<CountAllUsersResponseDTO>) {
    return Object.assign(this, partial);
  }
}
