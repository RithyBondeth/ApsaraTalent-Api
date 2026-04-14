import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CallAnswerResponseDTO } from './call-answer.dto';

/** WebSocket event: call-end — sent by either party */
export class CallEndDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  targetUserId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CallEndResponseDTO extends CallAnswerResponseDTO {}
