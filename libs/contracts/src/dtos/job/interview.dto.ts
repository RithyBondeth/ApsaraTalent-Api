import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum InterviewStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

/** Valid transitions: who can trigger which status change */
export const VALID_STATUS_TRANSITIONS: Record<string, InterviewStatus[]> = {
  pending: [
    InterviewStatus.ACCEPTED,
    InterviewStatus.DECLINED,
    InterviewStatus.CANCELLED,
  ],
  accepted: [InterviewStatus.CANCELLED, InterviewStatus.COMPLETED],
  declined: [],
  cancelled: [],
  completed: [],
};

export class CreateInterviewDto {
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

export class UpdateInterviewStatusDto {
  @IsString()
  @IsNotEmpty()
  interviewId: string;

  @IsEnum(InterviewStatus, {
    message:
      'Status must be one of: pending, accepted, declined, cancelled, completed',
  })
  status: InterviewStatus;

  @IsString()
  @IsOptional()
  requestUserId?: string;

  @IsString()
  @IsOptional()
  requestUserRole?: string;
}
