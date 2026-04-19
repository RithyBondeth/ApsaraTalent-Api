import { IsUUID } from 'class-validator';
import { CallAnswerResponseDTO } from './call-answer.dto';
import { RtcIceCandidate } from '../../../interfaces/domain/chat.interface';

/** WebSocket event: ice-candidate — sent by either party */
export class IceCandidateDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  targetUserId: string;

  /** WebRTC RTCIceCandidateInit (candidate string + sdpMid + sdpMLineIndex) */
  candidate: RtcIceCandidate;
}

export class IceCandidateResponseDTO extends CallAnswerResponseDTO {
  constructor(partial: Partial<IceCandidateResponseDTO>) {
    super(partial);
  }
}
