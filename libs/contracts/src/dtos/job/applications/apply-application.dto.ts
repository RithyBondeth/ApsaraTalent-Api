import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ApplyApplicationDTO {
  @IsUUID()
  jobId: string;

  @IsString()
  @IsOptional()
  coverLetterNote?: string;
}

export class ApplyApplicationResponseDTO {
  id: string;
  status: EApplicationStatus;
  coverLetterNote?: string;
  /** Set only on a rejection, and only when the company gave one. */
  rejectionReason?: string | null;
  /** Null until the owning company first opens the applicant list. */
  reviewedAt?: Date | null;
  /** Null while the application has never left PENDING. */
  statusChangedAt?: Date | null;
  appliedAt: Date;
  jobId?: string;
  jobTitle?: string;
  employeeId?: string;
  employeeName?: string;
  /**
   * The applicant's overall fit for this company, 0-100, reused from
   * `JobMatching.matchScore` rather than recomputed. Null when the pair has
   * never been scored — an applicant who arrived without ever swiping.
   * Only populated on the company's applicant list.
   */
  matchScore?: number | null;

  constructor(partial: Partial<ApplyApplicationResponseDTO>) {
    Object.assign(this, partial);
  }
}
