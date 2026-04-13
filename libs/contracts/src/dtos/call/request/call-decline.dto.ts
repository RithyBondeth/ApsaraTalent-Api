import { IsUUID } from 'class-validator';

/** WebSocket event: call-decline — sent by the receiver */
export class CallDeclineDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  callerId: string;

  constructor(partial: Partial<CallDeclineDTO>) {
    Object.assign(this, partial);
  }
}
