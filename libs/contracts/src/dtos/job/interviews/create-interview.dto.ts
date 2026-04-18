import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateInterviewDTO {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
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
  employee: any;
  company: any;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CreateInterviewResponseDTO>) {
    return Object.assign(this, partial);
  }
}

/** Generic alias used by the job-service microservice controller. */
export class InterviewResponseDTO extends CreateInterviewResponseDTO {
    constructor(partial: Partial<InterviewResponseDTO>) {
        super(partial);
            Object.assign(this, partial);
    }
}
