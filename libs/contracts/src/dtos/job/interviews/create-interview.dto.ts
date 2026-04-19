import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { EmployeeResponseDTO, CompanyResponseDTO } from '../../shared/user.dto';

export class CreateInterviewDTO {
  @IsUUID()
  employeeId: string;

  @IsUUID()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  meetingLink?: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}

export class CreateInterviewResponseDTO {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  location: string | null;
  meetingLink: string | null;
  status: string;
  createdBy: string | null;
  employee: EmployeeResponseDTO;
  company: CompanyResponseDTO;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CreateInterviewResponseDTO>) {
    Object.assign(this, partial);
  }
}

/** Generic alias used by the job-service microservice controller. */
export class InterviewResponseDTO extends CreateInterviewResponseDTO {
  constructor(partial: Partial<InterviewResponseDTO>) {
    super(partial);
  }
}
