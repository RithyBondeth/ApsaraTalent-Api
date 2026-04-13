import { IsUUID } from 'class-validator';

/** WebSocket event: ice-candidate — sent by either party */
export class IceCandidateDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  targetUserId: string;

  /** WebRTC ICE candidate object */
  candidate: any;

  constructor(partial: Partial<IceCandidateDTO>) {
    Object.assign(this, partial);
  }
}
