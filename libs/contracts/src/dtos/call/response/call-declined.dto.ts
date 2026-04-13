/** WebSocket event: call-declined — emitted to the caller */
export class CallDeclinedResponseDTO {
  callId: string;

  constructor(partial: Partial<CallDeclinedResponseDTO>) {
    Object.assign(this, partial);
  }
}
