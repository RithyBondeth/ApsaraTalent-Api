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
  appliedAt: Date;
  jobId?: string;
  jobTitle?: string;
  employeeId?: string;
  employeeName?: string;

  constructor(partial: Partial<ApplyApplicationResponseDTO>) {
    Object.assign(this, partial);
  }
}
