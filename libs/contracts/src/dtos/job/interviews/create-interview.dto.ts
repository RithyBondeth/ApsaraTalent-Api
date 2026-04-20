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
