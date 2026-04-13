/** WebSocket event: incoming-call — emitted to the receiver */
export class IncomingCallResponseDTO {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;

  /** WebRTC offer object */
  offer: any;

  constructor(partial: Partial<IncomingCallResponseDTO>) {
    Object.assign(this, partial);
  }
}
