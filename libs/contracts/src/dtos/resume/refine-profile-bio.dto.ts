import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum RefineProfileBioType {
  EMPLOYEE_BIO = 'employeeBio',
  EMPLOYEE_JOB_TITLE = 'employeeJobTitle',
  COMPANY_BIO = 'companyBio',
  EXPERIENCE_DESCRIPTION = 'experienceDescription',
  ACHIEVEMENT_BULLET = 'achievementBullet',
  SKILL_SUGGESTION = 'skillSuggestion',
  EDUCATION_DESCRIPTION = 'educationDescription',
}

export class RefineProfileBioDTO {
  @IsEnum(RefineProfileBioType)
  type: RefineProfileBioType;

  @IsString()
  @IsOptional()
  currentText?: string;

  /* ── Employee context ─────────────────────────────── */
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  experience?: string;

  @IsString()
  @IsOptional()
  availability?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  careerScopes?: string[];

  /* ── Company context ──────────────────────────────── */
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  openPositions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  values?: string[];
}
