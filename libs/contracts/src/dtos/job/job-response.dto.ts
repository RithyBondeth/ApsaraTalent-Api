import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { formatDateToDDMMYYYY } from '@app/utils/functions/date-formatter';

export class UserInJobResponseDTO {
  id: string;
  @Exclude() role: EUserRole;
  @Exclude() email: string | null;
  @Exclude() password: string | null;
  @Exclude() phone: string | null;
  @Exclude() otpCode: string | null;
  @Exclude() otpCodeExpires: Date | null;
  @Exclude() pushNotificationToken: string | null;
  @Exclude() profileCompleted: boolean;
  @Exclude() resetPasswordToken: string | null;
  @Exclude() resetPasswordExpires: Date | null;
  @Exclude() refreshToken: string | null;
  @Exclude() isEmailVerified: boolean;
  @Exclude() emailVerificationToken: string | null;
  @Exclude() isTwoFactorEnabled: boolean;
  @Exclude() twoFactorSecret: string | null;
  @Exclude() facebookId: string | null;
  @Exclude() googleId: string | null;
  @Exclude() linkedinId: string | null;
  @Exclude() githubId: string | null;
  @Exclude() createdAt: Date;

  constructor(partial: Partial<UserInJobResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class CompanyInJobResponseDTO {
  id: string;
  name: string;
  @Exclude() description: string;
  @Exclude() phone: string;
  avatar: string;
  @Exclude() cover: string;
  companySize: number;
  industry: string;
  location: string;
  @Exclude() foundedYear: number;
  @Exclude() createdAt: Date;
  @Type(() => UserInJobResponseDTO) user: UserInJobResponseDTO;

  constructor(partial: Partial<CompanyInJobResponseDTO>) {
    return Object.assign(this, partial);
  }
}

export class JobResponseDTO {
  id: string;
  title: string;
  description: string;
  type: string;

  @Exclude() experienceRequired: string;
  @Expose() get experience(): string { return this.experienceRequired; }

  @Exclude() educationRequired: string;
  @Expose() get education(): string { return this.educationRequired; }

  @Exclude() skillsRequired: string;
  @Expose() get skills(): string[] {
    return this.skillsRequired.split(',').map((s) => s.trim());
  }

  salary: string;

  @Exclude()
  @Transform(({ value }) => (value ? value.toISOString() : null))
  expireDate: Date;

  @Expose() get deadlineDate(): string | null {
    return this.expireDate ? formatDateToDDMMYYYY(new Date(this.expireDate)) : null;
  }

  @Exclude()
  @Transform(({ value }) => (value ? value.toISOString() : null))
  createdAt: Date;

  @Expose() get postedDate(): string | null {
    return this.createdAt ? formatDateToDDMMYYYY(new Date(this.createdAt)) : null;
  }

  @Type(() => CompanyInJobResponseDTO) company: CompanyInJobResponseDTO;
  isHide: boolean;

  constructor(partial: Partial<JobResponseDTO>) {
    return Object.assign(this, partial);
  }
}
