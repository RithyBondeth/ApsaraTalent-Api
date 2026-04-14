import { IsUUID } from 'class-validator';
import { CallAnswerResponseDTO } from './call-answer.dto';

/** WebSocket event: call-offer — sent by the caller */
export class CallOfferDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  receiverId: string;

  /** WebRTC offer object */
  offer: any;
}

export class CallOfferResponseDTO extends CallAnswerResponseDTO {}
