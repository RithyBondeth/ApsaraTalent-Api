import { IsUUID } from 'class-validator';
import { CallAnswerResponseDTO } from './call-answer.dto';

/** WebSocket event: call-decline — sent by the receiver */
export class CallDeclineDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  callerId: string;
}

export class CallDeclinedResponseDTO extends CallAnswerResponseDTO {
    constructor(partial: Partial<CallDeclinedResponseDTO>) {
        super(partial);
            Object.assign(this, partial);
    }
}
