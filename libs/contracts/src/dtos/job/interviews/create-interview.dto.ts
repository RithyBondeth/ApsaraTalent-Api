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
  @IsOptional()
  createdBy?: string;

  /**
   * The application this interview is for.
   *
   * Optional: an interview scheduled off a mutual match has no application
   * behind it, and that path is unchanged. When it is supplied, it both links
   * the interview to a role and stands in for the match gate — an application
   * is the candidate asking to be considered, which is the consent the gate
   * exists to check.
   */
  @IsUUID()
  @IsOptional()
  applicationId?: string;
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
  /** Null for interviews that came from a match rather than an application. */
  applicationId?: string | null;
  employee: EmployeeResponseDTO;
  company: CompanyResponseDTO;
  createdAt: Date;
  updatedAt: Date;
  /** Auth user ID to notify via socket — populated by the service, not persisted. */
  notifyUserId?: string | null;

  constructor(partial: any) {
    Object.assign(this, partial);
    if (this.employee && !(this.employee instanceof EmployeeResponseDTO)) {
      this.employee = new EmployeeResponseDTO(this.employee);
    }
    if (this.company && !(this.company instanceof CompanyResponseDTO)) {
      this.company = new CompanyResponseDTO(this.company);
    }
  }
}
