import { IsUUID } from 'class-validator';

/** WebSocket event: call-offer — sent by the caller */
export class CallOfferDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  receiverId: string;

  /** WebRTC offer object */
  offer: any;

  constructor(partial: Partial<CallOfferDTO>) {
    Object.assign(this, partial);
  }
}
