/** WebSocket event: remote-ice-candidate — emitted to the other party */
export class RemoteIceCandidateResponseDTO {
  callId: string;

  /** WebRTC ICE candidate object */
  candidate: any;

  constructor(partial: Partial<RemoteIceCandidateResponseDTO>) {
    Object.assign(this, partial);
  }
}
