import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateInterviewResponseDTO } from './create-interview.dto';

export enum InterviewStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

/** Maps each status to the set of statuses it is allowed to transition into. */
export const VALID_STATUS_TRANSITIONS: Record<string, InterviewStatus[]> = {
  [InterviewStatus.PENDING]: [
    InterviewStatus.ACCEPTED,
    InterviewStatus.DECLINED,
    InterviewStatus.CANCELLED,
  ],
  [InterviewStatus.ACCEPTED]: [
    InterviewStatus.COMPLETED,
    InterviewStatus.CANCELLED,
  ],
  [InterviewStatus.DECLINED]: [],
  [InterviewStatus.CANCELLED]: [],
  [InterviewStatus.COMPLETED]: [],
};

export class UpdateInterviewStatusDTO {
  @IsUUID()
  interviewId: string;

  @IsEnum(InterviewStatus, {
    message:
      'Status must be one of: pending, accepted, declined, cancelled, completed',
  })
  status: InterviewStatus;

  @IsUUID()
  @IsOptional()
  requestUserId?: string;

  @IsString()
  @IsOptional()
  requestUserRole?: string;
}

export class UpdateInterviewStatusResponseDTO extends CreateInterviewResponseDTO {
  constructor(partial: any) {
    super(partial);
  }
}
