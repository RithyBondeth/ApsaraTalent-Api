import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

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

/** WebSocket event: incoming-call — emitted to the receiver */
export class IncomingCallDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  callerId: string;

  @IsString()
  callerName: string;

  @IsString()
  callerAvatar: string;

  /** WebRTC offer object */
  offer: any;

  constructor(partial: Partial<IncomingCallDTO>) {
    Object.assign(this, partial);
  }
}

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

/** WebSocket event: call-answered — emitted to the caller */
export class CallAnsweredDTO {
  @IsUUID()
  callId: string;

  /** WebRTC answer object */
  answer: any;

  constructor(partial: Partial<CallAnsweredDTO>) {
    Object.assign(this, partial);
  }
}

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

/** WebSocket event: remote-ice-candidate — emitted to the other party */
export class RemoteIceCandidateDTO {
  @IsUUID()
  callId: string;

  /** WebRTC ICE candidate object */
  candidate: any;

  constructor(partial: Partial<RemoteIceCandidateDTO>) {
    Object.assign(this, partial);
  }
}

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

/** WebSocket event: call-declined — emitted to the caller */
export class CallDeclinedDTO {
  @IsUUID()
  callId: string;

  constructor(partial: Partial<CallDeclinedDTO>) {
    Object.assign(this, partial);
  }
}

/** WebSocket event: call-end — sent by either party */
export class CallEndDTO {
  @IsUUID()
  callId: string;

  @IsUUID()
  targetUserId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  constructor(partial: Partial<CallEndDTO>) {
    Object.assign(this, partial);
  }
}

/** WebSocket event: call-ended — emitted to the other party */
export class CallEndedDTO {
  @IsUUID()
  callId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  constructor(partial: Partial<CallEndedDTO>) {
    Object.assign(this, partial);
  }
}

/** Internal payload for logging call events as chat messages */
export class CallLogDTO {
  @IsUUID()
  senderId: string;

  @IsUUID()
  receiverId: string;

  @IsString()
  content: string;

  constructor(partial: Partial<CallLogDTO>) {
    Object.assign(this, partial);
  }
}

/** Standard response for call-related actions */
export class CallActionResponseDTO {
  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  constructor(partial: Partial<CallActionResponseDTO>) {
    Object.assign(this, partial);
  }
}
