import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class ApplyJobDTO {
  @IsUUID()
  jobId: string;

  @IsString()
  @IsOptional()
  coverLetterNote?: string;
}

export class UpdateApplicationStatusDTO {
  @IsUUID()
  applicationId: string;

  @IsEnum(EApplicationStatus)
  status: EApplicationStatus;
}

export class GetApplicationsDTO {
  @IsUUID()
  @IsOptional()
  jobId?: string;

  @IsUUID()
  @IsOptional()
  employeeId?: string;
}

export class ApplicationResponseDTO {
  id: string;
  status: EApplicationStatus;
  coverLetterNote?: string;
  appliedAt: Date;
  jobId?: string;
  jobTitle?: string;
  employeeId?: string;
  employeeName?: string;

  constructor(partial: Partial<ApplicationResponseDTO>) {
    Object.assign(this, partial);
  }
}
