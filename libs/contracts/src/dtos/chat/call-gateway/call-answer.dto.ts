import { IsUUID } from 'class-validator';

/** WebSocket event: call-answer — sent by the receiver */
export class CallAnswerDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  callerId: string;

  /** WebRTC answer object */
  answer: any;
}

export class CallAnswerResponseDTO {
  success: boolean;
  message?: string;

  constructor(partial: Partial<CallAnswerResponseDTO>) {
    Object.assign(this, partial);
  }
}
