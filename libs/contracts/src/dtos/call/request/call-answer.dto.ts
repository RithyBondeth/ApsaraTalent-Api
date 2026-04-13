import { IsUUID } from 'class-validator';

/** WebSocket event: call-answer — sent by the receiver */
export class CallAnswerDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  callerId: string;

  /** WebRTC answer object */
  answer: any;

  constructor(partial: Partial<CallAnswerDTO>) {
    Object.assign(this, partial);
  }
}
