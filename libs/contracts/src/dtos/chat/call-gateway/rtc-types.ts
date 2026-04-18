/**
 * Minimal typings for WebRTC signalling objects.
 * These mirror the browser's RTCSessionDescriptionInit and RTCIceCandidateInit
 * interfaces so NestJS DTOs stay fully typed without requiring @types/webrtc.
 */

/** Shape of an RTCSessionDescriptionInit — carries the SDP offer or answer. */
export interface RtcSessionDescription {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

/** Shape of an RTCIceCandidateInit — carries network path candidates. */
export interface RtcIceCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}
