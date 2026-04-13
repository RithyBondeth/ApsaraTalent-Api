/** WebSocket event: call-answered — emitted to the caller */
export class CallAnsweredResponseDTO {
  callId: string;

  /** WebRTC answer object */
  answer: any;

  constructor(partial: Partial<CallAnsweredResponseDTO>) {
    Object.assign(this, partial);
  }
}
