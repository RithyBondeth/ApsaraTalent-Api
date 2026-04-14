import { IsUUID } from 'class-validator';
import { CallAnswerResponseDTO } from './call-answer.dto';
import { RtcSessionDescription } from '../../../interfaces/domain/chat.interface';

/** WebSocket event: call-offer — sent by the caller */
export class CallOfferDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  receiverId: string;

  /** WebRTC RTCSessionDescriptionInit (type + SDP string) */
  offer: RtcSessionDescription;
}

export class CallOfferResponseDTO extends CallAnswerResponseDTO {}
