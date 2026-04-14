import { IsUUID } from 'class-validator';
import { CallAnswerResponseDTO } from './call-answer.dto';

/** WebSocket event: ice-candidate — sent by either party */
export class IceCandidateDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  targetUserId: string;

  /** WebRTC ICE candidate object */
  candidate: any;
}

export class IceCandidateResponseDTO extends CallAnswerResponseDTO {}
