import { IsUUID } from 'class-validator';
import { RtcSessionDescription } from '../../../interfaces/domain/chat.interface';

/** WebSocket event: call-answer — sent by the receiver */
export class CallAnswerDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  callerId: string;

  /** WebRTC RTCSessionDescriptionInit (type + SDP string) */
  answer: RtcSessionDescription;
}

export class CallAnswerResponseDTO {
  success: boolean;
  message?: string;

  constructor(partial: Partial<CallAnswerResponseDTO>) {
    Object.assign(this, partial);
  }
}
