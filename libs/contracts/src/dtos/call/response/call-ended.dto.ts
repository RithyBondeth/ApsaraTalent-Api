/** WebSocket event: call-ended — emitted to the other party */
export class CallEndedResponseDTO {
  callId: string;
  reason?: string;

  constructor(partial: Partial<CallEndedResponseDTO>) {
    Object.assign(this, partial);
  }
}
